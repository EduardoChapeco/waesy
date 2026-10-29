/**
 * OmniEditor.tsx — Editor Visual Bifurcado (Software UI Desktop vs WhatsApp List Mobile)
 * Padrão Wix-Level Builder & Figma / Webflow ergonomics.
 */

import React, { useEffect, useState } from "react";
import {
  OmniPageDocument,
  OmniBlockInstance,
  OmniBlockStyling,
  addBlockToPage,
  updateBlockInPage,
  removeBlockFromPage,
  moveBlockInPage,
  duplicateBlockInPage,
} from "./types";
import {
  SITE_BUILDER_BLOCKS,
  getSiteBlockById,
  WixBlockCategory,
  WIX_CATEGORY_CONFIG,
  BLOCK_TO_WIX_CATEGORY,
} from "./registry";
import { NicheTemplateDefinition } from "./templates";
import { STUDIO_TEMPLATE_CATALOG, getStudioTemplate, materializeStudioManifest, materializeStudioTemplate } from "@/lib/builder/studio-catalog";
import type { StudioTemplateManifest } from "@/lib/builder/studio-manifest";
import type { BuilderAssetRef } from "@/lib/builder/asset-contract";
import { LiveTemplatePreviewModal } from "./LiveTemplatePreviewModal";
import { StudioTemplateFactory } from "./StudioTemplateFactory";
import { BlockErrorBoundary } from "./BlockErrorBoundary";
import { HostingDomainConnectModal } from "./HostingDomainConnectModal";
import { BuilderCodeExplorerModal } from "@/components/admin/builder/BuilderCodeExplorerModal";
import { OmniAppMarketModal } from "@/components/admin/builder/OmniAppMarketModal";
import { BuilderDockedRail, type DockedRailActivePanel } from "@/components/admin/builder/builder-docked-rail";
import { BuilderAddPanel3Col } from "@/components/admin/builder/builder-add-panel-3col";
import { BuilderPagesPanel, type BuilderPageItem } from "@/components/admin/builder/builder-pages-panel";
import { BuilderGlobalThemePanel, type GlobalThemeConfig } from "@/components/admin/builder/builder-global-theme-panel";
import { BuilderCmsPanel } from "@/components/admin/builder/builder-cms-panel";
import { PhotoStudioModal } from "@/components/admin/builder/PhotoStudioModal";
import {
  WixVisualSitemapModal,
  WixMenuManagerDrawer,
  WixCmsCollectionManagerModal,
  WixBrandedAppAndHoppPanel,
  LovableAiSquadSplitPanel,
  WixScrollAnimationsAndDockingInspector,
  type WixAppNavConfig,
  type WixButtonStylerConfig,
} from "@/components/admin/builder/BuilderWixStudioPanels";
import { listStudioTemplateDrafts } from "@/services/studio-template-library.functions";
import { listPublicArticles } from "@/services/news.functions";

import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Settings2,
  Sliders,
  Smartphone,
  Monitor,
  Eye,
  Check,
  Palette,
  Calculator,
  LayoutTemplate,
  Layers,
  ArrowLeft,
  X,
  Send,
  Save,
  Image,
  Tag,
  MessageSquare,
  Mail,
  HelpCircle,
  CheckCircle2,
  UtensilsCrossed,
  ShoppingBag,
  Video,
  Calendar,
  Compass,
  Share2,
  Award,
  Clock,
  MapPin,
  Sparkles,
  SlidersHorizontal,
  Globe,
  Code2,
  Tablet,
  Undo2,
  Redo2,
  Database,
  Wand2,
  Menu as MenuIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

import { MediaUploader } from "@/components/admin/builder/MediaUploader";
import { BuilderViewportProvider } from "@/design-system/vitrine";
import {
  BidirectionalDeviceStylingFields,
  isVitrineAppBlock,
  VitrineBlockInspector,
} from "./vitrine-block-inspector";

export type { WixBlockCategory } from "./registry";


const BLOCK_ICONS: Record<string, any> = {
  // Hero
  // Hero
  news_promethee_portal: LayoutTemplate,
  news_promethee_header: LayoutTemplate,
  news_promethee_nav: Layers,
  news_promethee_breaking: Sparkles,
  news_promethee_feed: LayoutTemplate,
  news_promethee_ad_slot: Tag,
  news_promethee_article_reader: MessageSquare,
  news_promethee_footer: Globe,
  hero_minimal_split: LayoutTemplate,
  hero_interactive_carousel: Image,
  split_banner: LayoutTemplate,

  // Gastronomia
  food_menu_streamlined: UtensilsCrossed,
  food_menu_tabs: UtensilsCrossed,
  chef_special_banner: Sparkles,
  table_order_comanda: Tag,
  table_booking_card: Calendar,
  restaurant_hours_delivery: Clock,

  // Catálogo
  product_grid: ShoppingBag,
  curated_hits_rail: Sparkles,
  product_rail: ShoppingBag,
  flash_sale_hero: Tag,

  // Mídia & Galeria
  media_gallery_mosaic: Image,
  gallery_grid: Image,
  before_after_slider: SlidersHorizontal,
  video_section: Video,
  stories_ring: Image,

  // Serviços
  booking_calendar: Calendar,
  service_pricing_table: Tag,
  specialist_team_grid: Award,
  routine_steps: SlidersHorizontal,
  pricing_three_tiers: Tag,

  // Turismo
  tourism_quote_hero: Compass,
  tourism_destinations_carousel: Compass,
  tourism_services_grid: Compass,

  // BioLink & Social
  biolink_profile_header: Share2,
  biolink_action_buttons: Share2,
  biolink_pix_card: Tag,
  bento_asymmetric_4: Layers,
  trust_badges: Award,
  timeline_history: Clock,
  testimonials_social_proof: MessageSquare,

  // Contato & FAQ
  faq_clean_accordion: HelpCircle,
  contact_form_direct: Mail,
  location_map_card: MapPin,
  store_hours: Clock,
  store_contact: Mail,
  interactive_quote_calculator: Calculator,
  vitrine_metamorphic_banner: Image,
  vitrine_bento_tetris: Layers,
  vitrine_coupon_strip: Tag,
  vitrine_buttons_dock: Sparkles,
  vitrine_vertical_carousel: Video,
  vitrine_product_shelf: ShoppingBag,
  vitrine_classifieds_rail: Tag,
  vitrine_social_stream: MessageSquare,
  vitrine_ecosystem_rail: Compass,
};

interface BlockContentFieldsProps {
  selectedBlock: OmniBlockInstance;
  onUpdateConfig: (key: string, value: any) => void;
  onUpdateAssetRef?: (asset: BuilderAssetRef) => void;
  onClearAssetRef?: (usageSlot?: string) => void;
  onUpdateAssetAltText?: (usageSlot: string, altText: string) => void;
  unsplashUsageSlot?: string;
  unsplashDefaultQuery?: string;
  products?: any[];
  categories?: any[];
  collections?: any[];
  classifieds?: any[];
  posts?: any[];
  flyers?: any[];
  events?: any[];
  jobs?: any[];
  stores?: any[];
  banners?: any[];
  hotpages?: any[];
}

const CATALOG_BOUND_BLOCK_TYPES = new Set([
  "product_grid",
  "product_rail",
  "product_carousel",
  "curated_hits_rail",
  "dynamic_product_carousel",
  "food_menu_tabs",
  "food_menu_streamlined",
  "tourism_destinations_carousel",
  "travel_hotel_slider",
  "service_pricing_table",
  "event_rail",
  "news_promethee_portal",
  "news_promethee_breaking",
  "news_promethee_feed",
  "news_promethee_article_reader",
]);

export const BlockContentFields: React.FC<BlockContentFieldsProps> = ({
  selectedBlock,
  onUpdateConfig,
  onUpdateAssetRef,
  onClearAssetRef,
  onUpdateAssetAltText,
  unsplashUsageSlot,
  unsplashDefaultQuery,
  products = [],
  categories = [],
  collections = [],
  classifieds = [],
  posts = [],
  flyers = [],
  events = [],
  jobs = [],
  stores = [],
  banners = [],
  hotpages = [],
}) => {
  const config = selectedBlock.config as any;
  const isCatalogBlock = CATALOG_BOUND_BLOCK_TYPES.has(selectedBlock.type);

  if (isVitrineAppBlock(selectedBlock.type)) {
    return (
      <VitrineBlockInspector
        selectedBlock={selectedBlock}
        onUpdateConfig={onUpdateConfig}
        products={products}
        categories={categories}
        classifieds={classifieds}
        posts={posts}
        flyers={flyers}
        events={events}
        jobs={jobs}
        stores={stores}
        banners={banners}
        hotpages={hotpages}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Título Padrão / Headline Sincronizado */}
      {(config.title !== undefined || config.headline !== undefined) && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Título da Seção
          </label>
          <Input
            value={config.title ?? config.headline ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (config.title !== undefined) onUpdateConfig("title", val);
              if (config.headline !== undefined) onUpdateConfig("headline", val);
              if (config.title === undefined && config.headline === undefined) {
                onUpdateConfig("title", val);
              }
            }}
            className="h-11 min-h-11 rounded-lg text-xs"
          />
        </div>
      )}

      {/* 2. Subtítulo / Subheadline / Descrição */}
      {(config.subtitle !== undefined || config.subheadline !== undefined) && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Subtítulo / Descrição
          </label>
          <Textarea
            value={config.subtitle ?? config.subheadline ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (config.subtitle !== undefined) onUpdateConfig("subtitle", val);
              if (config.subheadline !== undefined) onUpdateConfig("subheadline", val);
            }}
            rows={3}
            className="rounded-lg text-xs resize-none"
          />
        </div>
      )}

      {/* 3. Badge Superior */}
      {(config.badgeText !== undefined || config.badge !== undefined) && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Pílula Superior (Badge)
          </label>
          <Input
            value={config.badgeText ?? config.badge ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (config.badgeText !== undefined) onUpdateConfig("badgeText", val);
              if (config.badge !== undefined) onUpdateConfig("badge", val);
            }}
            className="h-11 min-h-11 rounded-lg text-xs"
          />
        </div>
      )}

      {/* 3B. VÍNCULO COM CATÁLOGO REAL (Exclusivo para Blocos de Produtos, Serviços, Cardápio e Pacotes) */}
      {isCatalogBlock && (
        <div className="pt-3 border-t border-border/50 space-y-3 bg-muted/20 p-3 rounded-lg border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Fonte de Dados do Catálogo
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {products.length} item(ns) na loja
            </span>
          </div>

          {/* Filtro por Categoria */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Filtrar por Categoria
            </label>
            <select
              value={config.categoryId || config.filterCategory || ""}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateConfig("categoryId", val);
                onUpdateConfig("filterCategory", val);
              }}
              className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs"
            >
              <option value="">Todas as Categorias (Automático)</option>
              {categories.map((cat: any) => (
                <option key={cat.id || cat.slug} value={cat.id || cat.slug}>
                  {cat.name || cat.title || cat.slug}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Coleção (se houver coleções) */}
          {collections.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Vincular Coleção Curada
              </label>
              <select
                value={config.collectionId || config.collection_slug || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateConfig("collectionId", val);
                  onUpdateConfig("collection_slug", val);
                }}
                className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs"
              >
                <option value="">Nenhuma coleção específica</option>
                {collections.map((col: any) => (
                  <option key={col.id || col.slug} value={col.slug || col.id}>
                    {col.title || col.name || col.slug}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Layout de Colunas e Limite */}
          <div className="grid grid-cols-2 gap-2">
            {selectedBlock.type === "product_grid" && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Colunas (Desktop)
                </label>
                <select
                  value={Number(config.columns || 4)}
                  onChange={(e) => onUpdateConfig("columns", Number(e.target.value))}
                  className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-2 text-xs"
                >
                  <option value={2}>2 Colunas</option>
                  <option value={3}>3 Colunas</option>
                  <option value={4}>4 Colunas</option>
                  <option value={5}>5 Colunas</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Limite de Itens
              </label>
              <select
                value={Number(config.limit || 8)}
                onChange={(e) => onUpdateConfig("limit", Number(e.target.value))}
                className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value={4}>4 itens</option>
                <option value={6}>6 itens</option>
                <option value={8}>8 itens</option>
                <option value={12}>12 itens</option>
                <option value={16}>16 itens</option>
                <option value={24}>24 itens</option>
              </select>
            </div>
          </div>

          {/* Seleção Manual de Produtos / Pacotes Específicos */}
          {products.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-foreground">
                  Seleção Manual (Opcional)
                </label>
                {Array.isArray(config.selectedProductIds) && config.selectedProductIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdateConfig("selectedProductIds", [])}
                    className="text-xs text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Limpar ({config.selectedProductIds.length})
                  </button>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border/60 bg-background p-2">
                {products.slice(0, 50).map((prod: any) => {
                  const selectedIds: string[] = Array.isArray(config.selectedProductIds)
                    ? config.selectedProductIds
                    : [];
                  const isChecked = selectedIds.includes(String(prod.id));
                  return (
                    <label
                      key={prod.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/60 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selectedIds, String(prod.id)]
                            : selectedIds.filter((id) => id !== String(prod.id));
                          onUpdateConfig("selectedProductIds", next);
                        }}
                        className="rounded border-border"
                      />
                      <span className="truncate flex-1 font-medium text-foreground">
                        {prod.name || prod.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Imagem Principal Simples (Upload Real para Storage - Zero Mocks) */}
      {(config.imageUrl !== undefined || config.coverImageUrl !== undefined) && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            Imagem Principal
          </label>
          <MediaUploader
            value={config.imageUrl ?? config.coverImageUrl ?? ""}
            onChange={(url) => {
              if (config.imageUrl !== undefined) onUpdateConfig("imageUrl", url);
              if (config.coverImageUrl !== undefined) onUpdateConfig("coverImageUrl", url);
            }}
            bucket="public_media"
            folder="builder"
            label="Imagem de Destaque"
            allowUnsplash={Boolean(unsplashUsageSlot)}
            unsplashUsageSlot={unsplashUsageSlot}
            unsplashDefaultQuery={unsplashDefaultQuery}
            studioAssetUsageSlot={unsplashUsageSlot || `${selectedBlock.id}-hero`}
            onAssetSelected={(asset) => {
              onUpdateAssetRef?.(asset);
              onUpdateConfig("imageAlt", asset.alt_text || "");
            }}
            onAssetUploaded={(asset) => {
              onUpdateAssetRef?.(asset);
              onUpdateConfig("imageAlt", asset.alt_text || "");
            }}
            onAssetCleared={onClearAssetRef}
          />
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground" htmlFor={`image-alt-${selectedBlock.id}`}>
              Texto alternativo da imagem
            </label>
            <Input
              id={`image-alt-${selectedBlock.id}`}
              value={config.imageAlt || ""}
              onChange={(event) => {
                onUpdateConfig("imageAlt", event.target.value);
                onUpdateAssetAltText?.(unsplashUsageSlot || `${selectedBlock.id}-hero`, event.target.value);
              }}
              maxLength={500}
              placeholder="Descreva fielmente o que aparece; vazio apenas se decorativa"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
        </div>
      )}

      {/* 4B. Player de Vídeo Nativo & Embed (video_section) */}
      {selectedBlock.type === "video_section" && (
        <div className="pt-3 border-t border-border/50 space-y-3">
          <span className="text-xs font-bold text-foreground block">
            Configuração do Player de Vídeo
          </span>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              URL do Vídeo (YouTube, Vimeo ou .mp4 direto)
            </label>
            <Input
              value={config.video_url || config.videoUrl || ""}
              onChange={(e) => {
                onUpdateConfig("video_url", e.target.value);
                onUpdateConfig("videoUrl", e.target.value);
              }}
              placeholder="https://www.youtube.com/watch?v=... ou arquivo .mp4"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Ou envie arquivo de Vídeo (.mp4) / Capa
            </label>
            <MediaUploader
              value={config.video_url || ""}
              onChange={(url) => {
                onUpdateConfig("video_url", url);
                onUpdateConfig("videoUrl", url);
              }}
              bucket="public_media"
              folder="builder"
              label="Upload de Vídeo"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Proporção (Aspect Ratio)
              </label>
              <select
                value={config.aspect_ratio || "16:9"}
                onChange={(e) => onUpdateConfig("aspect_ratio", e.target.value)}
                className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-2 text-xs"
              >
                <option value="16:9">Widescreen (16:9)</option>
                <option value="9:16">Vertical / Reels (9:16)</option>
                <option value="4:3">Clássico (4:3)</option>
                <option value="1:1">Quadrado (1:1)</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.auto_play)}
                  onChange={(e) => onUpdateConfig("auto_play", e.target.checked)}
                />
                <span>Autoplay Mudo</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.loop ?? true)}
                  onChange={(e) => onUpdateConfig("loop", e.target.checked)}
                />
                <span>Repetir em Loop</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={config.button_text || ""}
              onChange={(e) => onUpdateConfig("button_text", e.target.value)}
              placeholder="Texto do botão (opcional)"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
            <Input
              value={config.button_link || ""}
              onChange={(e) => onUpdateConfig("button_link", e.target.value)}
              placeholder="Link de destino (#)"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
        </div>
      )}

      {/* 4C. Comparador Antes & Depois (before_after_slider) */}
      {selectedBlock.type === "before_after_slider" && (
        <div className="pt-3 border-t border-border/50 space-y-3">
          <span className="text-xs font-bold text-foreground block">
            Imagens de Comparação (Antes e Depois)
          </span>
          <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              1. Imagem "Antes"
            </label>
            <MediaUploader
              value={config.beforeImageUrl || ""}
              onChange={(url) => onUpdateConfig("beforeImageUrl", url)}
              bucket="public_media"
              folder="builder"
              label="Foto Antes"
            />
            <Input
              value={config.beforeLabel || "Antes"}
              onChange={(e) => onUpdateConfig("beforeLabel", e.target.value)}
              placeholder="Rótulo Antes"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
          <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              2. Imagem "Depois"
            </label>
            <MediaUploader
              value={config.afterImageUrl || ""}
              onChange={(url) => onUpdateConfig("afterImageUrl", url)}
              bucket="public_media"
              folder="builder"
              label="Foto Depois"
            />
            <Input
              value={config.afterLabel || "Depois"}
              onChange={(e) => onUpdateConfig("afterLabel", e.target.value)}
              placeholder="Rótulo Depois"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
        </div>
      )}

      {/* 5. Galeria de Mídia Mosaico & Gallery Grid (Uploads Reais + Link Clicável por Imagem) */}
      {(selectedBlock.type === "media_gallery_mosaic" || selectedBlock.type === "gallery_grid") && (
        <div className="pt-2 border-t border-border/40 space-y-3">
          {selectedBlock.type === "gallery_grid" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Colunas
                </label>
                <select
                  value={Number(config.columns || 3)}
                  onChange={(e) => onUpdateConfig("columns", Number(e.target.value))}
                  className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-2 text-xs"
                >
                  <option value={2}>2 Colunas</option>
                  <option value={3}>3 Colunas</option>
                  <option value={4}>4 Colunas</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Formato
                </label>
                <select
                  value={config.aspectRatio || "square"}
                  onChange={(e) => onUpdateConfig("aspectRatio", e.target.value)}
                  className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-2 text-xs"
                >
                  <option value="square">Quadrado (1:1)</option>
                  <option value="video">Horizontal (16:9)</option>
                  <option value="portrait">Vertical (3:4)</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Fotos da Galeria</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const listKey = selectedBlock.type === "gallery_grid" ? "images" : "items";
                const current = config[listKey] || config.items || [];
                const newItem = {
                  id: `g-${Date.now()}`,
                  url: "",
                  imageUrl: "",
                  imageAlt: "",
                  alt: "",
                  title: "Nova Foto",
                  caption: "",
                  link: "",
                };
                onUpdateConfig(listKey, [...current, newItem]);
              }}
              className="h-11 min-h-11 text-xs px-3 rounded-lg gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Adicionar Foto
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {((selectedBlock.type === "gallery_grid" ? config.images : config.items) || []).map((item: any, idx: number) => {
              const listKey = selectedBlock.type === "gallery_grid" ? "images" : "items";
              const currentList = config[listKey] || [];
              return (
                <div key={item.id || idx} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>Foto #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClearAssetRef?.(`${selectedBlock.id}-gallery-${item.id || idx}`);
                        onUpdateConfig(
                          listKey,
                          currentList.filter((_: any, i: number) => i !== idx)
                        );
                      }}
                      className="text-destructive hover:underline text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Remover
                    </button>
                  </div>
                  <MediaUploader
                    value={item.imageUrl || item.url || ""}
                    onChange={(url) => {
                      const current = [...currentList];
                      current[idx] = { ...current[idx], imageUrl: url, url };
                      onUpdateConfig(listKey, current);
                    }}
                    bucket="public_media"
                    folder="builder"
                    label="Mídia da Galeria"
                    studioAssetUsageSlot={`${selectedBlock.id}-gallery-${item.id || idx}`}
                    onAssetUploaded={onUpdateAssetRef}
                    onAssetCleared={onClearAssetRef}
                  />
                  <Input
                    value={item.title || ""}
                    onChange={(e) => {
                      const current = [...currentList];
                      current[idx] = { ...current[idx], title: e.target.value };
                      onUpdateConfig(listKey, current);
                    }}
                    placeholder="Título da foto"
                    className="h-11 min-h-11 text-xs"
                  />
                  <Input
                    value={item.caption || ""}
                    onChange={(e) => {
                      const current = [...currentList];
                      current[idx] = { ...current[idx], caption: e.target.value };
                      onUpdateConfig(listKey, current);
                    }}
                    placeholder="Legenda da foto"
                    className="h-11 min-h-11 text-xs"
                  />
                  <Input
                    value={item.link || item.href || ""}
                    onChange={(e) => {
                      const current = [...currentList];
                      current[idx] = { ...current[idx], link: e.target.value, href: e.target.value };
                      onUpdateConfig(listKey, current);
                    }}
                    placeholder="Link ao clicar (ex: /paginas/roteiros ou #cotacao)"
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5B. Mosaic Banners & Stories Ring (Banners Clicáveis Vinculáveis a Páginas) */}
      {selectedBlock.type === "mosaic_banners" && (
        <div className="pt-2 border-t border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Banners do Mosaico</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const current = config.banners || [];
                onUpdateConfig("banners", [
                  ...current,
                  {
                    id: `b-${Date.now()}`,
                    title: "Novo Banner",
                    subtitle: "Subtítulo promocional",
                    imageUrl: "",
                    ctaText: "Explorar",
                    link: "#",
                    span: "normal",
                  },
                ]);
              }}
              className="h-11 min-h-11 text-xs px-3 rounded-lg gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Adicionar Banner
            </Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {(config.banners || []).map((banner: any, idx: number) => (
              <div key={banner.id || idx} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Banner #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = config.banners || [];
                      onUpdateConfig(
                        "banners",
                        current.filter((_: any, i: number) => i !== idx)
                      );
                    }}
                    className="text-destructive hover:underline text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Remover
                  </button>
                </div>
                <MediaUploader
                  value={banner.imageUrl || ""}
                  onChange={(url) => {
                    const current = [...(config.banners || [])];
                    current[idx] = { ...current[idx], imageUrl: url };
                    onUpdateConfig("banners", current);
                  }}
                  bucket="public_media"
                  folder="builder"
                  label="Imagem do Banner"
                />
                <Input
                  value={banner.title || ""}
                  onChange={(e) => {
                    const current = [...(config.banners || [])];
                    current[idx] = { ...current[idx], title: e.target.value };
                    onUpdateConfig("banners", current);
                  }}
                  placeholder="Título do Banner"
                  className="h-11 min-h-11 text-xs"
                />
                <Input
                  value={banner.subtitle || ""}
                  onChange={(e) => {
                    const current = [...(config.banners || [])];
                    current[idx] = { ...current[idx], subtitle: e.target.value };
                    onUpdateConfig("banners", current);
                  }}
                  placeholder="Subtítulo"
                  className="h-11 min-h-11 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={banner.ctaText || ""}
                    onChange={(e) => {
                      const current = [...(config.banners || [])];
                      current[idx] = { ...current[idx], ctaText: e.target.value };
                      onUpdateConfig("banners", current);
                    }}
                    placeholder="Texto do Botão"
                    className="h-11 min-h-11 text-xs"
                  />
                  <Input
                    value={banner.link || ""}
                    onChange={(e) => {
                      const current = [...(config.banners || [])];
                      current[idx] = { ...current[idx], link: e.target.value };
                      onUpdateConfig("banners", current);
                    }}
                    placeholder="Link (/paginas/...)"
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Carrossel de Destaques (Slides com Upload Real + Link de Página por Slide) */}
      {selectedBlock.type === "hero_interactive_carousel" && (
        <div className="pt-2 border-t border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Slides do Carrossel</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const current = config.slides || [];
                const newSlide = {
                  id: `slide-${Date.now()}`,
                  title: "Novo Slide",
                  subtitle: "Descrição do slide em destaque",
                  imageUrl: "",
                  imageAlt: "",
                  ctaText: "Ver Mais",
                  ctaHref: "#",
                  primaryCta: { label: "Ver Mais", href: "#" },
                };
                onUpdateConfig("slides", [...current, newSlide]);
              }}
              className="h-11 min-h-11 text-xs px-3 rounded-lg gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Adicionar Slide
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {(config.slides || []).map((slide: any, idx: number) => (
              <div key={slide.id || idx} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Slide #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = config.slides || [];
                      onClearAssetRef?.(`${selectedBlock.id}-slide-${slide.id || idx}`);
                      onUpdateConfig(
                        "slides",
                        current.filter((_: any, i: number) => i !== idx)
                      );
                    }}
                    className="text-destructive hover:underline text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Remover
                  </button>
                </div>
                <MediaUploader
                  value={slide.imageUrl || ""}
                  onChange={(url) => {
                    const current = [...(config.slides || [])];
                    current[idx] = { ...current[idx], imageUrl: url };
                    onUpdateConfig("slides", current);
                  }}
                  bucket="public_media"
                  folder="builder"
                  label="Imagem do Slide"
                  studioAssetUsageSlot={`${selectedBlock.id}-slide-${slide.id || idx}`}
                  onAssetUploaded={onUpdateAssetRef}
                  onAssetCleared={onClearAssetRef}
                />
                <Input
                  value={slide.title || ""}
                  onChange={(e) => {
                    const current = [...(config.slides || [])];
                    current[idx] = { ...current[idx], title: e.target.value };
                    onUpdateConfig("slides", current);
                  }}
                  placeholder="Título do Slide"
                  className="h-11 min-h-11 text-xs"
                />
                <Input
                  value={slide.subtitle || ""}
                  onChange={(e) => {
                    const current = [...(config.slides || [])];
                    current[idx] = { ...current[idx], subtitle: e.target.value };
                    onUpdateConfig("slides", current);
                  }}
                  placeholder="Subtítulo do Slide"
                  className="h-11 min-h-11 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={slide.ctaText || slide.primaryCta?.label || ""}
                    onChange={(e) => {
                      const current = [...(config.slides || [])];
                      const label = e.target.value;
                      const href = current[idx].ctaHref || current[idx].primaryCta?.href || "#";
                      current[idx] = {
                        ...current[idx],
                        ctaText: label,
                        primaryCta: { label, href },
                      };
                      onUpdateConfig("slides", current);
                    }}
                    placeholder="Texto do Botão"
                    className="h-11 min-h-11 text-xs"
                  />
                  <Input
                    value={slide.ctaHref || slide.primaryCta?.href || ""}
                    onChange={(e) => {
                      const current = [...(config.slides || [])];
                      const href = e.target.value;
                      const label = current[idx].ctaText || current[idx].primaryCta?.label || "Explorar";
                      current[idx] = {
                        ...current[idx],
                        ctaHref: href,
                        primaryCta: { label, href },
                      };
                      onUpdateConfig("slides", current);
                    }}
                    placeholder="Link (/paginas/...)"
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6B. Blocos de Turismo: Motor de Cotação, Pacote & Roteiro Dia a Dia */}
      {(selectedBlock.type === "dynamic_booking_hero" || selectedBlock.type === "tourism_quote_hero") && (
        <div className="pt-3 border-t border-border/50 space-y-3 bg-muted/20 p-3 rounded-lg border border-border/60">
          <span className="text-xs font-bold text-foreground block">
            Motor de Busca & Cotação (Turismo / GDS)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Origem Padrão
              </label>
              <Input
                value={config.defaultOrigin || ""}
                onChange={(e) => onUpdateConfig("defaultOrigin", e.target.value)}
                placeholder="Ex: Chapecó (XAP)"
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Destino Sugerido
              </label>
              <Input
                value={config.defaultDestination || ""}
                onChange={(e) => onUpdateConfig("defaultDestination", e.target.value)}
                placeholder="Ex: Maceió, Cancún..."
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                WhatsApp da Agência
              </label>
              <Input
                value={config.whatsappPhone || ""}
                onChange={(e) => onUpdateConfig("whatsappPhone", e.target.value)}
                placeholder="5549999999999"
                className="h-11 min-h-11 rounded-lg text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Texto do Botão
              </label>
              <Input
                value={config.ctaButtonText || ""}
                onChange={(e) => onUpdateConfig("ctaButtonText", e.target.value)}
                placeholder="Cotar Viagem Agora"
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {selectedBlock.type === "travel_package_hero" && (
        <div className="pt-3 border-t border-border/50 space-y-3 bg-muted/20 p-3 rounded-lg border border-border/60">
          <span className="text-xs font-bold text-foreground block">
            Ficha do Pacote Turístico
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Destino
              </label>
              <Input
                value={config.destination || ""}
                onChange={(e) => onUpdateConfig("destination", e.target.value)}
                placeholder="Maceió & Maragogi"
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Duração
              </label>
              <Input
                value={config.durationText || ""}
                onChange={(e) => onUpdateConfig("durationText", e.target.value)}
                placeholder="7 Dias / 6 Noites"
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Preço por Pessoa (R$)
              </label>
              <Input
                type="number"
                value={config.priceCents ? Number(config.priceCents) / 100 : ""}
                onChange={(e) => onUpdateConfig("priceCents", Math.round(Number(e.target.value || 0) * 100))}
                placeholder="3490"
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Parcelas Sem Juros
              </label>
              <Input
                type="number"
                value={config.installmentsCount || 10}
                onChange={(e) => onUpdateConfig("installmentsCount", Number(e.target.value || 1))}
                placeholder="10"
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={config.hotelName || ""}
              onChange={(e) => onUpdateConfig("hotelName", e.target.value)}
              placeholder="Nome do Hotel / Resort"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
            <Input
              value={config.whatsappPhone || ""}
              onChange={(e) => onUpdateConfig("whatsappPhone", e.target.value)}
              placeholder="WhatsApp (55499...)"
              className="h-11 min-h-11 rounded-lg text-xs font-mono"
            />
          </div>
        </div>
      )}

      {selectedBlock.type === "travel_itinerary_timeline" && (
        <div className="pt-3 border-t border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Dias do Roteiro</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const current = config.days || [];
                onUpdateConfig("days", [
                  ...current,
                  {
                    id: `day-${Date.now()}`,
                    dayNumber: current.length + 1,
                    title: `Dia ${current.length + 1}: Novo Passeio`,
                    location: "Destino",
                    description: "Descrição das atividades do dia.",
                    meals: "Café da manhã incluso",
                    accommodation: "",
                  },
                ]);
              }}
              className="h-11 min-h-11 text-xs px-3 rounded-lg gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Adicionar Dia
            </Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {(config.days || []).map((day: any, idx: number) => (
              <div key={day.id || idx} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Dia #{day.dayNumber || idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = config.days || [];
                      onUpdateConfig(
                        "days",
                        current.filter((_: any, i: number) => i !== idx)
                      );
                    }}
                    className="text-destructive hover:underline text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Remover
                  </button>
                </div>
                <Input
                  value={day.title || ""}
                  onChange={(e) => {
                    const current = [...(config.days || [])];
                    current[idx] = { ...current[idx], title: e.target.value };
                    onUpdateConfig("days", current);
                  }}
                  placeholder="Título do Dia"
                  className="h-11 min-h-11 text-xs"
                />
                <Input
                  value={day.location || ""}
                  onChange={(e) => {
                    const current = [...(config.days || [])];
                    current[idx] = { ...current[idx], location: e.target.value };
                    onUpdateConfig("days", current);
                  }}
                  placeholder="Localização / Cidade"
                  className="h-11 min-h-11 text-xs"
                />
                <Textarea
                  value={day.description || ""}
                  onChange={(e) => {
                    const current = [...(config.days || [])];
                    current[idx] = { ...current[idx], description: e.target.value };
                    onUpdateConfig("days", current);
                  }}
                  rows={2}
                  placeholder="Descrição detalhada do dia"
                  className="text-xs resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6C. Perguntas Frequentes (faq_clean_accordion) */}
      {selectedBlock.type === "faq_clean_accordion" && (
        <div className="pt-3 border-t border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Perguntas Frequentes (FAQ)</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const current = config.items || [];
                onUpdateConfig("items", [
                  ...current,
                  {
                    id: `faq-${Date.now()}`,
                    question: "Nova pergunta?",
                    answer: "Resposta clara e objetiva.",
                  },
                ]);
              }}
              className="h-11 min-h-11 text-xs px-3 rounded-lg gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Adicionar
            </Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {(config.items || []).map((item: any, idx: number) => (
              <div key={item.id || idx} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Pergunta #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = config.items || [];
                      onUpdateConfig(
                        "items",
                        current.filter((_: any, i: number) => i !== idx)
                      );
                    }}
                    className="text-destructive hover:underline text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Remover
                  </button>
                </div>
                <Input
                  value={item.question || ""}
                  onChange={(e) => {
                    const current = [...(config.items || [])];
                    current[idx] = { ...current[idx], question: e.target.value };
                    onUpdateConfig("items", current);
                  }}
                  placeholder="Pergunta"
                  className="h-11 min-h-11 text-xs"
                />
                <Textarea
                  value={item.answer || ""}
                  onChange={(e) => {
                    const current = [...(config.items || [])];
                    current[idx] = { ...current[idx], answer: e.target.value };
                    onUpdateConfig("items", current);
                  }}
                  rows={2}
                  placeholder="Resposta"
                  className="text-xs resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6C-2. Calculadora de Cotação Interativa (interactive_quote_calculator) */}
      {selectedBlock.type === "interactive_quote_calculator" && (
        <div className="pt-3 border-t border-border/50 space-y-3">
          <span className="text-xs font-bold text-foreground block">
            Parâmetros de Cálculo da Cotação
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Rótulo Unidade (Singular)
              </label>
              <Input
                value={config.unitLabel || "Item"}
                onChange={(e) => onUpdateConfig("unitLabel", e.target.value)}
                placeholder="Ex: Pessoa, Hora, Quarto"
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Rótulo Unidade (Plural)
              </label>
              <Input
                value={config.unitPluralLabel || "Itens"}
                onChange={(e) => onUpdateConfig("unitPluralLabel", e.target.value)}
                placeholder="Ex: Pessoas, Horas, Quartos"
                className="h-11 min-h-11 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Valor Base Fixo (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={(Number(config.basePriceCents || 0) / 100).toFixed(2)}
                onChange={(e) =>
                  onUpdateConfig(
                    "basePriceCents",
                    Math.round(Math.max(0, parseFloat(e.target.value) || 0) * 100)
                  )
                }
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Valor por Unidade (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={(Number(config.unitPriceCents || 0) / 100).toFixed(2)}
                onChange={(e) =>
                  onUpdateConfig(
                    "unitPriceCents",
                    Math.round(Math.max(0, parseFloat(e.target.value) || 0) * 100)
                  )
                }
                className="h-11 min-h-11 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Mínimo
              </label>
              <Input
                type="number"
                min="1"
                value={Number(config.minUnits ?? 1)}
                onChange={(e) =>
                  onUpdateConfig("minUnits", Math.max(1, parseInt(e.target.value) || 1))
                }
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Máximo
              </label>
              <Input
                type="number"
                min="1"
                value={Number(config.maxUnits ?? 50)}
                onChange={(e) =>
                  onUpdateConfig("maxUnits", Math.max(1, parseInt(e.target.value) || 50))
                }
                className="h-11 min-h-11 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Padrão
              </label>
              <Input
                type="number"
                min="1"
                value={Number(config.defaultUnits ?? 5)}
                onChange={(e) =>
                  onUpdateConfig("defaultUnits", Math.max(1, parseInt(e.target.value) || 5))
                }
                className="h-11 min-h-11 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              WhatsApp para Destino da Cotação (com DDD)
            </label>
            <Input
              value={config.whatsappNumber || ""}
              onChange={(e) => onUpdateConfig("whatsappNumber", e.target.value)}
              placeholder="Ex: 5511999998888"
              className="h-11 min-h-11 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Texto do Botão de Envio
            </label>
            <Input
              value={config.submitButtonText || "Solicitar Proposta Oficial"}
              onChange={(e) => onUpdateConfig("submitButtonText", e.target.value)}
              placeholder="Ex: Solicitar Proposta Oficial"
              className="h-11 min-h-11 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Aviso Legal / Disclaimer
            </label>
            <Input
              value={config.disclaimer || ""}
              onChange={(e) => onUpdateConfig("disclaimer", e.target.value)}
              placeholder="Ex: Valores estimados sujeitos à confirmação."
              className="h-11 min-h-11 text-xs"
            />
          </div>

          {/* Opcionais da Calculadora */}
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-foreground">Opcionais & Adicionais</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const current = config.options || [];
                  onUpdateConfig("options", [
                    ...current,
                    {
                      id: `opt-${Date.now()}`,
                      label: "Novo Opcional",
                      description: "Descrição do serviço ou comodidade",
                      priceCents: 5000,
                      isDefault: false,
                    },
                  ]);
                }}
                className="h-11 min-h-11 text-xs px-3 rounded-lg gap-1 cursor-pointer"
              >
                <Plus className="size-3.5" />
                Adicionar Opcional
              </Button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {(config.options || []).map((opt: any, idx: number) => (
                <div
                  key={opt.id || idx}
                  className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>Opcional #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = config.options || [];
                        onUpdateConfig(
                          "options",
                          current.filter((_: any, i: number) => i !== idx)
                        );
                      }}
                      className="text-destructive hover:underline text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Remover
                    </button>
                  </div>
                  <Input
                    value={opt.label || ""}
                    onChange={(e) => {
                      const current = [...(config.options || [])];
                      current[idx] = { ...current[idx], label: e.target.value };
                      onUpdateConfig("options", current);
                    }}
                    placeholder="Nome do Opcional (ex: Café da Manhã)"
                    className="h-11 min-h-11 text-xs"
                  />
                  <Input
                    value={opt.description || ""}
                    onChange={(e) => {
                      const current = [...(config.options || [])];
                      current[idx] = { ...current[idx], description: e.target.value };
                      onUpdateConfig("options", current);
                    }}
                    placeholder="Descrição breve"
                    className="h-11 min-h-11 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-2xs text-muted-foreground mb-1">
                        Valor Adicional (R$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(Number(opt.priceCents || 0) / 100).toFixed(2)}
                        onChange={(e) => {
                          const current = [...(config.options || [])];
                          current[idx] = {
                            ...current[idx],
                            priceCents: Math.round(
                              Math.max(0, parseFloat(e.target.value) || 0) * 100
                            ),
                          };
                          onUpdateConfig("options", current);
                        }}
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                    <div className="flex items-center pt-4">
                      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(opt.isDefault)}
                          onChange={(e) => {
                            const current = [...(config.options || [])];
                            current[idx] = { ...current[idx], isDefault: e.target.checked };
                            onUpdateConfig("options", current);
                          }}
                        />
                        <span>Marcado por padrão</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6D. Botões de Ação BioLink (biolink_action_buttons) */}
      {selectedBlock.type === "biolink_action_buttons" && (
        <div className="pt-3 border-t border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Botões de Link</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const current = config.links || [];
                onUpdateConfig("links", [
                  ...current,
                  {
                    id: `link-${Date.now()}`,
                    label: "Novo Link",
                    sublabel: "Acesse agora",
                    href: "https://",
                    highlight: false,
                  },
                ]);
              }}
              className="h-11 min-h-11 text-xs px-3 rounded-lg gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Adicionar Link
            </Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {(config.links || []).map((lnk: any, idx: number) => (
              <div key={lnk.id || idx} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Botão #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = config.links || [];
                      onUpdateConfig(
                        "links",
                        current.filter((_: any, i: number) => i !== idx)
                      );
                    }}
                    className="text-destructive hover:underline text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Remover
                  </button>
                </div>
                <Input
                  value={lnk.label || ""}
                  onChange={(e) => {
                    const current = [...(config.links || [])];
                    current[idx] = { ...current[idx], label: e.target.value };
                    onUpdateConfig("links", current);
                  }}
                  placeholder="Título do botão"
                  className="h-11 min-h-11 text-xs"
                />
                <Input
                  value={lnk.sublabel || ""}
                  onChange={(e) => {
                    const current = [...(config.links || [])];
                    current[idx] = { ...current[idx], sublabel: e.target.value };
                    onUpdateConfig("links", current);
                  }}
                  placeholder="Subtítulo opcional"
                  className="h-11 min-h-11 text-xs"
                />
                <Input
                  value={lnk.href || ""}
                  onChange={(e) => {
                    const current = [...(config.links || [])];
                    current[idx] = { ...current[idx], href: e.target.value };
                    onUpdateConfig("links", current);
                  }}
                  placeholder="URL de destino (https://... ou /paginas/...)"
                  className="h-11 min-h-11 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Depoimentos de Clientes (Avatares com Upload Real) */}
      {selectedBlock.type === "testimonials_social_proof" && (
        <div className="pt-2 border-t border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Depoimentos</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const current = config.testimonials || [];
                const newT = {
                  id: `t-${Date.now()}`,
                  name: "Nome do Cliente",
                  role: "Empresa / Cidade",
                  avatarUrl: "",
                  imageAlt: "",
                  rating: 5,
                  comment: "Excelente experiência e atendimento pontual.",
                  verified: true,
                };
                onUpdateConfig("testimonials", [...current, newT]);
              }}
              className="h-11 min-h-11 text-xs px-3 rounded-lg gap-1 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Adicionar
            </Button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {(config.testimonials || []).map((t: any, idx: number) => (
              <div key={t.id || idx} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Depoimento #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = config.testimonials || [];
                      onClearAssetRef?.(`${selectedBlock.id}-testimonial-${t.id || idx}`);
                      onUpdateConfig(
                        "testimonials",
                        current.filter((_: any, i: number) => i !== idx)
                      );
                    }}
                    className="text-destructive hover:underline text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Remover
                  </button>
                </div>
                <MediaUploader
                  value={t.avatarUrl || ""}
                  onChange={(url) => {
                    const current = [...(config.testimonials || [])];
                    current[idx] = { ...current[idx], avatarUrl: url };
                    onUpdateConfig("testimonials", current);
                  }}
                  bucket="public_media"
                  folder="builder"
                  aspect={1}
                  cropShape="round"
                  label="Foto do Cliente"
                  studioAssetUsageSlot={`${selectedBlock.id}-testimonial-${t.id || idx}`}
                  onAssetUploaded={onUpdateAssetRef}
                  onAssetCleared={onClearAssetRef}
                />
                <Input
                  value={t.name || ""}
                  onChange={(e) => {
                    const current = [...(config.testimonials || [])];
                    current[idx] = { ...current[idx], name: e.target.value };
                    onUpdateConfig("testimonials", current);
                  }}
                  placeholder="Nome do Cliente"
                  className="h-11 min-h-11 text-xs"
                />
                <Input
                  value={t.role || ""}
                  onChange={(e) => {
                    const current = [...(config.testimonials || [])];
                    current[idx] = { ...current[idx], role: e.target.value };
                    onUpdateConfig("testimonials", current);
                  }}
                  placeholder="Cargo ou Cidade"
                  className="h-11 min-h-11 text-xs"
                />
                <Textarea
                  value={t.comment || ""}
                  onChange={(e) => {
                    const current = [...(config.testimonials || [])];
                    current[idx] = { ...current[idx], comment: e.target.value };
                    onUpdateConfig("testimonials", current);
                  }}
                  rows={2}
                  placeholder="Comentário do cliente"
                  className="text-xs resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Botão Principal (CTA) */}
      {config.primaryCta && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Botão Principal (CTA)
          </span>
          <Input
            value={config.primaryCta.label || ""}
            onChange={(e) =>
              onUpdateConfig("primaryCta", {
                ...config.primaryCta,
                label: e.target.value,
              })
            }
            placeholder="Texto do Botão"
            className="h-11 min-h-11 rounded-lg text-xs"
          />
          <Input
            value={config.primaryCta.href || ""}
            onChange={(e) =>
              onUpdateConfig("primaryCta", {
                ...config.primaryCta,
                href: e.target.value,
              })
            }
            placeholder="Link de Destino (#contato)"
            className="h-11 min-h-11 rounded-lg text-xs"
          />
        </div>
      )}

      {/* 9. Campos de Identificação Comercial (Nome da Loja / Horários / Contato Direto) */}
      {config.storeName !== undefined && (
        <div className="pt-2 border-t border-border/40">
          <label className="block text-xs font-semibold text-foreground mb-1">
            Nome do Estabelecimento
          </label>
          <Input
            value={config.storeName || ""}
            onChange={(e) => onUpdateConfig("storeName", e.target.value)}
            className="h-11 min-h-11 rounded-lg text-xs"
          />
        </div>
      )}

      {(config.openingHoursText !== undefined || config.openingHours !== undefined) && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Horário de Funcionamento
          </label>
          <Input
            value={config.openingHoursText ?? config.openingHours ?? ""}
            onChange={(e) => {
              if (config.openingHoursText !== undefined) onUpdateConfig("openingHoursText", e.target.value);
              if (config.openingHours !== undefined) onUpdateConfig("openingHours", e.target.value);
            }}
            className="h-11 min-h-11 rounded-lg text-xs"
          />
        </div>
      )}

      {config.whatsappNumber !== undefined && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            WhatsApp para Receber Mensagens
          </label>
          <Input
            value={config.whatsappNumber || ""}
            onChange={(e) => onUpdateConfig("whatsappNumber", e.target.value)}
            placeholder="5549999999999"
            className="h-11 min-h-11 rounded-lg text-xs font-mono"
          />
        </div>
      )}

      {/* 10. Botões de Ação Personalizados */}
      {config.buttonText !== undefined && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            Botão de Ação
          </label>
          <Input
            value={config.buttonText || ""}
            onChange={(e) => onUpdateConfig("buttonText", e.target.value)}
            placeholder="Texto do Botão"
            className="h-11 min-h-11 rounded-lg text-xs"
          />
          {config.buttonLink !== undefined && (
            <Input
              value={config.buttonLink || ""}
              onChange={(e) => onUpdateConfig("buttonLink", e.target.value)}
              placeholder="Link (#produtos)"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          )}
        </div>
      )}

      {/* 11. Mesa & Wi-Fi de Autoatendimento */}
      {config.tableNumber !== undefined && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            Número da Mesa / Comanda
          </label>
          <Input
            value={config.tableNumber || ""}
            onChange={(e) => onUpdateConfig("tableNumber", e.target.value)}
            className="h-11 min-h-11 rounded-lg text-xs font-mono"
          />
          {config.wifiName !== undefined && (
            <Input
              value={config.wifiName || ""}
              onChange={(e) => onUpdateConfig("wifiName", e.target.value)}
              placeholder="Nome da Rede Wi-Fi"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          )}
        </div>
      )}

      {/* 12. Prato Estrela do Chef */}
      {config.dishName !== undefined && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            Nome do Prato Estrela
          </label>
          <Input
            value={config.dishName || ""}
            onChange={(e) => onUpdateConfig("dishName", e.target.value)}
            className="h-11 min-h-11 rounded-lg text-xs"
          />
          {config.description !== undefined && (
            <Textarea
              value={config.description || ""}
              onChange={(e) => onUpdateConfig("description", e.target.value)}
              placeholder="Descrição dos ingredientes"
              rows={2}
              className="text-xs resize-none"
            />
          )}
        </div>
      )}

      {/* 13. BioLink (Handle, Nome, Bio) */}
      {config.handle !== undefined && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            @Handle / Identificador BioLink
          </label>
          <Input
            value={config.handle || ""}
            onChange={(e) => onUpdateConfig("handle", e.target.value)}
            placeholder="@seunome"
            className="h-11 min-h-11 rounded-lg text-xs font-mono"
          />
          {config.bio !== undefined && (
            <Textarea
              value={config.bio || ""}
              onChange={(e) => onUpdateConfig("bio", e.target.value)}
              placeholder="Mini biografia"
              rows={2}
              className="text-xs resize-none"
            />
          )}
        </div>
      )}

      {/* 14. Chave Pix */}
      {config.pixKey !== undefined && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            Chave Pix para Pagamento Rápido
          </label>
          <Input
            value={config.pixKey || ""}
            onChange={(e) => onUpdateConfig("pixKey", e.target.value)}
            placeholder="contato@empresa.com.br"
            className="h-11 min-h-11 rounded-lg text-xs font-mono"
          />
          {config.beneficiaryName !== undefined && (
            <Input
              value={config.beneficiaryName || ""}
              onChange={(e) => onUpdateConfig("beneficiaryName", e.target.value)}
              placeholder="Nome do Beneficiário"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          )}
        </div>
      )}

      {/* 15. Endereço Físico */}
      {selectedBlock.type === "news_promethee_portal" && (
        <div className="pt-3 border-t border-border/60 space-y-4">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-3">
            <span className="text-xs font-bold text-foreground block">
              Configuração do Portal Prométhée
            </span>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nome do Jornal (Masthead)
              </label>
              <Input
                value={config.mastheadTitle || ""}
                onChange={(e) => onUpdateConfig("mastheadTitle", e.target.value)}
                placeholder="Ex: Waesy News / Portal Editorial"
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Subtítulo Editorial
              </label>
              <Input
                value={config.mastheadSubtitle || ""}
                onChange={(e) => onUpdateConfig("mastheadSubtitle", e.target.value)}
                placeholder="Jornalismo Regional & Curadoria"
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Fonte de Alimentação das Notícias
              </label>
              <select
                value={config.dataSource || "approved_mined_AND_custom"}
                onChange={(e) => onUpdateConfig("dataSource", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-xs font-semibold text-foreground"
              >
                <option value="approved_mined_AND_custom">
                  Notícias Mineradas Aprovadas + Pautas Editoriais
                </option>
                <option value="approved_mined_only">
                  Somente Catálogo de Notícias Mineradas Aprovadas
                </option>
                <option value="custom_editorial">
                  Somente Pautas Editoriais Manuais deste Bloco
                </option>
              </select>
            </div>

            <MediaUploader
              label="Logo do Jornal (Opcional — Padrão: Domo Prométhée)"
              value={config.logoUrl || ""}
              onChange={(url) => onUpdateConfig("logoUrl", url)}
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showCityFilter !== false}
                  onChange={(e) => onUpdateConfig("showCityFilter", e.target.checked)}
                />
                <span>Filtro Cidades</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.allowCitizenPosts !== false}
                  onChange={(e) => onUpdateConfig("allowCitizenPosts", e.target.checked)}
                />
                <span>Botão + Publicar</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showBreakingCarousel !== false}
                  onChange={(e) => onUpdateConfig("showBreakingCarousel", e.target.checked)}
                />
                <span>Carrossel Breaking</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showAds !== false}
                  onChange={(e) => onUpdateConfig("showAds", e.target.checked)}
                />
                <span>Espaços ADS</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Cidades do Filtro (separadas por vírgula)
              </label>
              <Input
                value={Array.isArray(config.cities) ? config.cities.join(", ") : ""}
                onChange={(e) =>
                  onUpdateConfig(
                    "cities",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="Notícias do Vale, São José dos Campos, Taubaté..."
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Abas Editoriais (separadas por vírgula)
              </label>
              <Input
                value={Array.isArray(config.categories) ? config.categories.join(", ") : ""}
                onChange={(e) =>
                  onUpdateConfig(
                    "categories",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="Para você, Urgente, Segurança, Economia..."
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Lista Editável de Notícias / Pautas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                Matérias & Destaques ({(config.articles || []).length})
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const next = [
                    ...(config.articles || []),
                    {
                      id: `art_${Date.now()}`,
                      title: "Nova matéria editorial da região",
                      lead: "Resumo jornalístico direto com os principais fatos apurados pela redação.",
                      body: "Texto integral da reportagem com parágrafos estruturados.",
                      category: "Urgente",
                      city: "São José dos Campos",
                      publishedAgo: "Agora",
                      readingTime: "3 min",
                      author: "Redação",
                      imageUrl: "",
                      imageAlt: "",
                      isBreaking: true,
                      likesCount: 12,
                      commentsCount: 3,
                    },
                  ];
                  onUpdateConfig("articles", next);
                }}
                className="h-11 min-h-11 px-3 text-xs rounded-lg"
              >
                <Plus className="size-3.5 mr-1" />
                Nova Matéria
              </Button>
            </div>

            {(config.articles || []).map((art: any, idx: number) => (
              <div
                key={art.id || idx}
                className="p-3 rounded-xl border border-border/70 bg-card space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">
                    Matéria #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = (config.articles || []).filter((_: any, i: number) => i !== idx);
                      onUpdateConfig("articles", next);
                    }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="Remover matéria"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <Input
                  value={art.title || ""}
                  onChange={(e) => {
                    const next = [...(config.articles || [])];
                    next[idx] = { ...art, title: e.target.value };
                    onUpdateConfig("articles", next);
                  }}
                  placeholder="Título da reportagem"
                  className="h-11 min-h-11 rounded-lg text-xs"
                />

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={art.city || ""}
                    onChange={(e) => {
                      const next = [...(config.articles || [])];
                      next[idx] = { ...art, city: e.target.value };
                      onUpdateConfig("articles", next);
                    }}
                    placeholder="Cidade"
                    className="h-11 min-h-11 rounded-lg text-xs"
                  />
                  <Input
                    value={art.category || ""}
                    onChange={(e) => {
                      const next = [...(config.articles || [])];
                      next[idx] = { ...art, category: e.target.value };
                      onUpdateConfig("articles", next);
                    }}
                    placeholder="Editoria"
                    className="h-11 min-h-11 rounded-lg text-xs"
                  />
                </div>

                <Textarea
                  value={art.lead || ""}
                  onChange={(e) => {
                    const next = [...(config.articles || [])];
                    next[idx] = { ...art, lead: e.target.value };
                    onUpdateConfig("articles", next);
                  }}
                  placeholder="Lead / Resumo da notícia"
                  rows={2}
                  className="text-xs resize-none rounded-lg"
                />

                <MediaUploader
                  label="Foto de Capa da Matéria"
                  value={art.imageUrl || ""}
                  onChange={(url) => {
                    const next = [...(config.articles || [])];
                    next[idx] = { ...art, imageUrl: url };
                    onUpdateConfig("articles", next);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedBlock.type === "news_promethee_header" && (
        <div className="pt-3 border-t border-border/50 space-y-3 bg-muted/20 p-3 rounded-xl border border-border/60">
          <span className="text-xs font-bold text-foreground block">Topo Editorial & Filtro GPS</span>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Marca do Portal</label>
            <Input
              value={config.mastheadTitle || ""}
              onChange={(e) => onUpdateConfig("mastheadTitle", e.target.value)}
              placeholder="Ex: Waesy News"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Estilo da Logo</label>
              <select
                value={config.logoStyle || "promethee_dome"}
                onChange={(e) => onUpdateConfig("logoStyle", e.target.value)}
                className="w-full h-11 min-h-11 rounded-lg border border-border bg-card px-2 text-xs"
              >
                <option value="promethee_dome">Domo Editorial</option>
                <option value="custom_image">Imagem Própria</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Rótulo Geral</label>
              <Input
                value={config.allCitiesLabel || "Todas as Cidades"}
                onChange={(e) => onUpdateConfig("allCitiesLabel", e.target.value)}
                className="h-11 min-h-11 rounded-lg text-xs"
              />
            </div>
          </div>
          {config.logoStyle === "custom_image" && (
            <MediaUploader
              label="Logo do Portal"
              value={config.logoUrl || ""}
              onChange={(url) => onUpdateConfig("logoUrl", url)}
            />
          )}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Cidades Sugeridas (separadas por vírgula)
            </label>
            <Input
              value={Array.isArray(config.cities) ? config.cities.join(", ") : ""}
              onChange={(e) =>
                onUpdateConfig(
                  "cities",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
        </div>
      )}

      {selectedBlock.type === "news_promethee_nav" && (
        <div className="pt-3 border-t border-border/50 space-y-3 bg-muted/20 p-3 rounded-xl border border-border/60">
          <span className="text-xs font-bold text-foreground block">Menu de Editorias & Botão +</span>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Editorias (separadas por vírgula)
            </label>
            <Input
              value={Array.isArray(config.categories) ? config.categories.join(", ") : ""}
              onChange={(e) =>
                onUpdateConfig(
                  "categories",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground min-h-11">
            <input
              type="checkbox"
              checked={config.allowCitizenPosts !== false}
              onChange={(e) => onUpdateConfig("allowCitizenPosts", e.target.checked)}
            />
            <span>Exibir botão fixo + para envio de pauta</span>
          </label>
        </div>
      )}

      {(selectedBlock.type === "news_promethee_breaking" || selectedBlock.type === "news_promethee_feed") && (
        <div className="pt-3 border-t border-border/50 space-y-3 bg-muted/20 p-3 rounded-xl border border-border/60">
          <span className="text-xs font-bold text-foreground block">Configurações do Feed de Notícias</span>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Título da Seção</label>
            <Input
              value={config.sectionTitle || ""}
              onChange={(e) => onUpdateConfig("sectionTitle", e.target.value)}
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
          {selectedBlock.type === "news_promethee_feed" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Layout</label>
                <select
                  value={config.layoutMode || "feed_stream"}
                  onChange={(e) => onUpdateConfig("layoutMode", e.target.value)}
                  className="w-full h-11 min-h-11 rounded-lg border border-border bg-card px-2 text-xs"
                >
                  <option value="feed_stream">Stream Vertical</option>
                  <option value="bento_2col">Grade 2 Colunas</option>
                  <option value="vitrine_shelf">Trilho Horizontal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Fonte</label>
                <select
                  value={config.dataSource || "approved_mined_AND_custom"}
                  onChange={(e) => onUpdateConfig("dataSource", e.target.value)}
                  className="w-full h-11 min-h-11 rounded-lg border border-border bg-card px-2 text-xs"
                >
                  <option value="approved_mined_AND_custom">Mineradas + Próprias</option>
                  <option value="approved_mined_only">Somente Mineradas</option>
                  <option value="custom_editorial">Somente Próprias</option>
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              URL da Página de Leitura (opcional)
            </label>
            <Input
              value={config.articlePageHref || ""}
              onChange={(e) => onUpdateConfig("articlePageHref", e.target.value)}
              placeholder="Ex: /paginas/artigo (vazio abre inline)"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
        </div>
      )}

      {selectedBlock.type === "news_promethee_ad_slot" && (
        <div className="pt-3 border-t border-border/50 space-y-3 bg-muted/20 p-3 rounded-xl border border-border/60">
          <span className="text-xs font-bold text-foreground block">Espaço Publicitário ADS</span>
          <Input
            value={config.sponsorName || ""}
            onChange={(e) => onUpdateConfig("sponsorName", e.target.value)}
            placeholder="Nome do anunciante"
            className="h-11 min-h-11 rounded-lg text-xs"
          />
          <Input
            value={config.headline || ""}
            onChange={(e) => onUpdateConfig("headline", e.target.value)}
            placeholder="Chamada comercial"
            className="h-11 min-h-11 rounded-lg text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={config.ctaLabel || ""}
              onChange={(e) => onUpdateConfig("ctaLabel", e.target.value)}
              placeholder="Texto do botão"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
            <Input
              value={config.ctaHref || ""}
              onChange={(e) => onUpdateConfig("ctaHref", e.target.value)}
              placeholder="Link de destino"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          </div>
          <MediaUploader
            label="Imagem / Banner do Anúncio"
            value={config.imageUrl || ""}
            onChange={(url) => onUpdateConfig("imageUrl", url)}
          />
        </div>
      )}

      {selectedBlock.type === "news_promethee_footer" && (
        <div className="pt-3 border-t border-border/50 space-y-3 bg-muted/20 p-3 rounded-xl border border-border/60">
          <span className="text-xs font-bold text-foreground block">Rodapé Editorial</span>
          <Input
            value={config.brandName || ""}
            onChange={(e) => onUpdateConfig("brandName", e.target.value)}
            placeholder="Nome do Portal"
            className="h-11 min-h-11 rounded-lg text-xs"
          />
          <Input
            value={config.tagline || ""}
            onChange={(e) => onUpdateConfig("tagline", e.target.value)}
            placeholder="Assinatura editorial"
            className="h-11 min-h-11 rounded-lg text-xs"
          />
          <label className="flex items-center gap-2 text-xs font-semibold text-foreground min-h-11">
            <input
              type="checkbox"
              checked={config.showWaesySignature !== false}
              onChange={(e) => onUpdateConfig("showWaesySignature", e.target.checked)}
            />
            <span>Exibir selo discreto Feito com Waesy</span>
          </label>
        </div>
      )}

      {(config.address !== undefined || config.addressText !== undefined) && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <label className="block text-xs font-semibold text-foreground">
            Endereço & Cidade
          </label>
          <Input
            value={config.address ?? config.addressText ?? ""}
            onChange={(e) => {
              if (config.address !== undefined) onUpdateConfig("address", e.target.value);
              if (config.addressText !== undefined) onUpdateConfig("addressText", e.target.value);
            }}
            placeholder="Rua, Número, Bairro"
            className="h-11 min-h-11 rounded-lg text-xs"
          />
          {config.cityState !== undefined && (
            <Input
              value={config.cityState || ""}
              onChange={(e) => onUpdateConfig("cityState", e.target.value)}
              placeholder="Cidade - UF"
              className="h-11 min-h-11 rounded-lg text-xs"
            />
          )}
        </div>
      )}
    </div>
  );
};

interface OmniEditorProps {
  initialDocument: OmniPageDocument;
  onSave?: (document: OmniPageDocument) => Promise<void> | void;
  onPublish?: (document: OmniPageDocument) => Promise<void> | void;
  onBack?: () => void;
  products?: any[];
  categories?: any[];
  collections?: any[];
  classifieds?: any[];
  posts?: any[];
  flyers?: any[];
  events?: any[];
  jobs?: any[];
  stores?: any[];
  banners?: any[];
  hotpages?: any[];
  storeData?: any;
}

export const OmniEditor: React.FC<OmniEditorProps> = ({
  initialDocument,
  onSave,
  onPublish,
  onBack,
  products = [],
  categories = [],
  collections = [],
  classifieds = [],
  posts = [],
  flyers = [],
  events = [],
  jobs = [],
  stores = [],
  banners = [],
  hotpages = [],
  storeData = null,
}) => {
  const [document, setDocument] = useState<OmniPageDocument>(initialDocument);
  const [activeStudioManifest, setActiveStudioManifest] = useState<StudioTemplateManifest | null>(
    () => getStudioTemplate(initialDocument.source_template_id ?? "") ?? null,
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initialDocument.title);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    document.blocks[0]?.id || null
  );
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile" | "native_app">("desktop");
  const [editorMode, setEditorMode] = useState<"visual" | "split" | "code">("visual");
  const [dockedPanel, setDockedPanel] = useState<DockedRailActivePanel>("add");
  const [isAddPanel3ColOpen, setIsAddPanel3ColOpen] = useState(false);
  const [isVisualSitemapOpen, setIsVisualSitemapOpen] = useState(false);
  const [isMenuManagerOpen, setIsMenuManagerOpen] = useState(false);
  const [isCmsTableModalOpen, setIsCmsTableModalOpen] = useState(false);
  const [isPhotoStudioOpen, setIsPhotoStudioOpen] = useState(false);
  const [historyPast, setHistoryPast] = useState<OmniPageDocument[]>([]);
  const [historyFuture, setHistoryFuture] = useState<OmniPageDocument[]>([]);
  const [sitePages, setSitePages] = useState<BuilderPageItem[]>(() => [
    {
      id: initialDocument.id || "home",
      title: initialDocument.title || "Início",
      slug: `/${initialDocument.slug || ""}`.replace("//", "/"),
      is_home: true,
      seo_title: `${initialDocument.title || "Início"} | Vitrine Oficial`,
      seo_description: "Confira catálogo atualizado, pacotes de viagem e atendimento direto.",
    },
    {
      id: "page_catalog",
      title: "Catálogo & Ofertas",
      slug: "/catalogo",
      is_home: false,
    },
    {
      id: "page_cars",
      title: "Aluguel de Carros (3 Diárias)",
      slug: "/mobilidade",
      is_home: false,
    },
  ]);
  const [activePageId, setActivePageId] = useState<string>(initialDocument.id || "home");
  const [globalTheme, setGlobalTheme] = useState<GlobalThemeConfig>(() => ({
    // design-lint-ignore DL-01 reason:"Valores iniciais do contrato de estado de tema global" expiry:"2027-12-31"
    primaryColor: "#09090b",
    // design-lint-ignore DL-01 reason:"Valores iniciais do contrato de estado de tema global" expiry:"2027-12-31"
    backgroundColor: "#ffffff",
    // design-lint-ignore DL-01 reason:"Valores iniciais do contrato de estado de tema global" expiry:"2027-12-31"
    textColor: "#09090b",
    headingFont: "Inter, sans-serif",
    bodyFont: "Inter, sans-serif",
    borderRadius: "xl",
    surfaceStyle: "clean",
  }));
  const [appNavConfig, setAppNavConfig] = useState<WixAppNavConfig>({
    barPosition: "bottom",
    showLabelsUnderIcons: true,
    tabs: ["Início", "Catálogo", "Reservas", "Ofertas", "Perfil"],
  });
  const [buttonStyler, setButtonStyler] = useState<WixButtonStylerConfig>({
    activeRole: "primary",
    shape: "squircle",
    uppercase: false,
    borderWidthPx: 1,
  });
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [isCodeExplorerOpen, setIsCodeExplorerOpen] = useState(false);
  const [isAppMarketOpen, setIsAppMarketOpen] = useState(false);
  const [liveNewsArticles, setLiveNewsArticles] = useState<any[]>([]);

  const commitDocumentChange = (nextDoc: OmniPageDocument) => {
    setHistoryPast((prev) => [...prev.slice(-29), document]);
    setHistoryFuture([]);
    setDocument(nextDoc);
  };

  const handleUndo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [document, ...prev]);
    setDocument(previous);
    toast.info("Ação desfeita (Undo).");
  };

  const handleRedo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((prev) => prev.slice(1));
    setHistoryPast((prev) => [...prev, document]);
    setDocument(next);
    toast.info("Ação refeita (Redo).");
  };

  useEffect(() => {
    let active = true;
    listPublicArticles({ data: { limit: 20, regionHint: "vale_do_paraiba" } })
      .then((rows) => {
        if (active && Array.isArray(rows)) setLiveNewsArticles(rows);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const handleFinishRename = () => {
    setIsEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== document.title) {
      setDocument((prev) => ({
        ...prev,
        title: titleDraft.trim(),
        updated_at: new Date().toISOString(),
      }));
      toast.success("Título atualizado.");
    }
  };

  // Painéis do Desktop
  const [leftTab, setLeftTab] = useState<"blocks" | "templates">("blocks");
  const [activeBlockCategory, setActiveBlockCategory] = useState<WixBlockCategory>("all");
  const [previewTemplate, setPreviewTemplate] = useState<NicheTemplateDefinition | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"content" | "styling" | "animation_cms">("content");

  // Mobile Bottom Sheets
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isMobileAddOpen, setIsMobileAddOpen] = useState(false);
  const [isMobileTemplateOpen, setIsMobileTemplateOpen] = useState(false);
  const [isMobileLayersOpen, setIsMobileLayersOpen] = useState(false);
  const [mobileInspectorTab, setMobileInspectorTab] = useState<"content" | "styling">("content");

  const filteredBlocks = SITE_BUILDER_BLOCKS.filter((block) => {
    if (activeBlockCategory === "all") return true;
    return BLOCK_TO_WIX_CATEGORY[block.id] === activeBlockCategory;
  });

  const selectedBlock = document.blocks.find((b) => b.id === selectedBlockId);
  const unsplashDecorativeSlot = activeStudioManifest?.assetSlots.find(
    (slot) => slot.allowUnsplash && slot.purpose === "decorative",
  );

  useEffect(() => {
    const sourceId = initialDocument.source_template_id;
    if (!sourceId?.startsWith("ai_") || activeStudioManifest) return;
    let active = true;
    listStudioTemplateDrafts({ data: {} })
      .then(({ drafts }) => {
        if (active) setActiveStudioManifest(drafts.find((draft) => draft.id === sourceId) ?? null);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [initialDocument.source_template_id, activeStudioManifest]);

  // ── MANIPULADORES DE ESTADO IMUTÁVEL ──

  const handleAddBlock = (blockType: string) => {
    const def = getSiteBlockById(blockType);
    const updated = addBlockToPage(document, blockType, def.defaultProps, def.defaultStyling);
    commitDocumentChange(updated);
    const newlyAdded = updated.blocks[updated.blocks.length - 1];
    setSelectedBlockId(newlyAdded.id);
    setIsMobileAddOpen(false);
    toast.success(`Bloco "${def.name}" adicionado com sucesso!`);
  };

  const handleApplyTemplate = (templateId: string) => {
    const updated = materializeStudioTemplate(document, templateId);
    setActiveStudioManifest(getStudioTemplate(templateId) ?? null);
    commitDocumentChange(updated);
    if (updated.blocks.length > 0) {
      setSelectedBlockId(updated.blocks[0].id);
    }
    toast.success("Template aplicado com sucesso!");
  };

  const handleApplyStudioManifest = (template: StudioTemplateManifest) => {
    const updated = materializeStudioManifest(document, template);
    setActiveStudioManifest(template);
    commitDocumentChange(updated);
    if (updated.blocks.length > 0) setSelectedBlockId(updated.blocks[0].id);
    toast.success("Template aplicado como rascunho editável. Revise os findings antes de publicar.");
  };

  const handleUpdateConfig = (key: string, value: any) => {
    if (!selectedBlockId) return;
    const updated = updateBlockInPage(document, selectedBlockId, { [key]: value });
    commitDocumentChange(updated);
  };

  const handleUpdateAssetRef = (asset: BuilderAssetRef) => {
    if (!selectedBlockId) return;
    setDocument((current) => ({
      ...current,
      blocks: current.blocks.map((block) => block.id !== selectedBlockId ? block : {
        ...block,
        assetRefs: [
          ...(block.assetRefs ?? []).filter((existing) => existing.usage_slot !== asset.usage_slot),
          asset,
        ],
      }),
      updated_at: new Date().toISOString(),
    }));
  };

  const handleClearAssetRef = (usageSlot?: string) => {
    if (!usageSlot) return;
    if (!selectedBlockId) return;
    setDocument((current) => ({
      ...current,
      blocks: current.blocks.map((block) => block.id !== selectedBlockId ? block : {
        ...block,
        assetRefs: (block.assetRefs ?? []).filter((asset) => asset.usage_slot !== usageSlot),
      }),
      updated_at: new Date().toISOString(),
    }));
  };

  const handleUpdateAssetAltText = (usageSlot: string, altText: string) => {
    if (!selectedBlockId) return;
    setDocument((current) => ({
      ...current,
      blocks: current.blocks.map((block) => block.id !== selectedBlockId ? block : {
        ...block,
        assetRefs: (block.assetRefs ?? []).map((asset) => asset.usage_slot === usageSlot ? { ...asset, alt_text: altText } : asset),
      }),
      updated_at: new Date().toISOString(),
    }));
  };

  const handleUpdateSectionAnchorId = (anchorId: string) => {
    if (!selectedBlockId) return;
    setDocument((current) => ({
      ...current,
      blocks: current.blocks.map((block) =>
        block.id !== selectedBlockId
          ? block
          : { ...block, sectionAnchorId: anchorId || undefined },
      ),
      updated_at: new Date().toISOString(),
    }));
  };

  const handleUpdateStyling = (stylingKey: keyof OmniBlockStyling, value: any) => {
    if (!selectedBlockId) return;
    const updated = updateBlockInPage(document, selectedBlockId, {}, { [stylingKey]: value });
    commitDocumentChange(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    const updated = moveBlockInPage(document, index, target);
    commitDocumentChange(updated);
  };

  const handleDuplicate = (blockId: string) => {
    const updated = duplicateBlockInPage(document, blockId);
    commitDocumentChange(updated);
    toast.success("Bloco duplicado!");
  };

  const handleRemove = (blockId: string) => {
    const updated = removeBlockFromPage(document, blockId);
    commitDocumentChange(updated);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(updated.blocks[0]?.id || null);
    }
    toast.info("Bloco removido.");
  };

  const handleSaveDocument = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave({
          ...document,
          pages: sitePages,
          updated_at: new Date().toISOString(),
        } as any);
      }
      toast.success("Página e sitemap visual salvos com sucesso no banco!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar página.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishDocument = async () => {
    setIsPublishing(true);
    try {
      if (onPublish) {
        await onPublish({
          ...document,
          pages: sitePages,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }
      toast.success("Página e sitemap publicados com sucesso! Já está ativa para os visitantes.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao publicar página.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-background text-foreground flex flex-col overflow-hidden select-none font-sans">
      {/* ── TOPBAR DO EDITOR (UNIVERSAL - SOFTWARE PRO SILENCE) ── */}
      <header className="h-14 border-b border-border/80 bg-background/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
              title="Voltar ao painel"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold tracking-tight shrink-0">
            <Layers className="size-3.5" />
            <span>Waesy Studio</span>
          </div>

          {/* Nome do Projeto com Renomeação Inline */}
          {isEditingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFinishRename();
                if (e.key === "Escape") {
                  setTitleDraft(document.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="h-11 min-h-11 text-xs sm:text-sm font-bold bg-muted/60 text-foreground px-2 py-1 rounded-lg border border-foreground/30 outline-hidden max-w-40 sm:max-w-xs"
            />
          ) : (
            <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
              onClick={() => {
                setTitleDraft(document.title);
                setIsEditingTitle(true);
              }}
              className="h-11 min-h-11 flex items-center gap-2 cursor-pointer group px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Clique para renomear"
            >
              <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate max-w-36 sm:max-w-48">
                {document.title}
              </span>
              <span className="text-xs text-muted-foreground font-mono hidden lg:inline">
                /{document.slug}
              </span>
            </div>
          )}

          {/* Controles Transacionais Undo / Redo + Autosave Badge */}
          <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-border/60">
            <button
              type="button"
              disabled={historyPast.length === 0}
              onClick={handleUndo}
              title="Desfazer (Ctrl+Z)"
              className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              type="button"
              disabled={historyFuture.length === 0}
              onClick={handleRedo}
              title="Refazer (Ctrl+Y)"
              className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Redo2 className="size-4" />
            </button>
            <span className="px-2 py-1 rounded bg-muted/60 text-xs font-semibold text-muted-foreground">
              Autosave ativo
            </span>
          </div>
        </div>

        {/* Alternador de Viewport + Modo de Estúdio (Desktop Only) */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`h-11 min-h-11 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewport === "desktop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              title="Desktop (1440px)"
            >
              <Monitor className="size-3.5" />
              <span className="hidden lg:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport("tablet")}
              className={`h-11 min-h-11 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewport === "tablet" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              title="Tablet (768px)"
            >
              <Tablet className="size-3.5" />
              <span className="hidden lg:inline">Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`h-11 min-h-11 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewport === "mobile" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              title="Mobile Web (390px)"
            >
              <Smartphone className="size-3.5" />
              <span className="hidden lg:inline">Mobile</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport("native_app")}
              className={`h-11 min-h-11 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                viewport === "native_app" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              title="Branded Native App Frame (Top/Bottom Tab Bar)"
            >
              <Sparkles className="size-3.5" />
              <span className="hidden lg:inline">App Nativo</span>
            </button>
          </div>

          {/* Alternador Visual | Split IA (Lovable) */}
          <div className="hidden lg:flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setEditorMode("visual")}
              className={`h-11 min-h-11 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                editorMode === "visual" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            >
              Visual
            </button>
            <button
              type="button"
              onClick={() => setEditorMode(editorMode === "split" ? "visual" : "split")}
              className={`h-11 min-h-11 px-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                editorMode === "split" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              title="Lovable AI Squad Split View"
            >
              <Wand2 className="size-3.5" />
              <span>Split IA</span>
            </button>
          </div>
        </div>

        {/* Cluster de Ações: Sitemap + Menu + Apps + Código + Domínio + Preview + Salvar + Publicar */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVisualSitemapOpen(true)}
            className="hidden xl:inline-flex h-11 min-h-11 px-3 rounded-lg border-border text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary"
            title="Mapa Visual de Páginas & SEO/GEO"
          >
            <Layers className="size-4 mr-1" />
            <span>Sitemap & GEO</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAppMarketOpen(true)}
            className="h-11 min-h-11 px-3 rounded-lg border-primary/40 text-primary hover:bg-primary/10 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary"
            title="Omni Apps Market"
          >
            <LayoutTemplate className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Apps</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCodeExplorerOpen(true)}
            className="h-11 min-h-11 px-3 rounded-lg border-border text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary"
            title="Explorador de Código TanStack"
          >
            <Code2 className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Código</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDomainModalOpen(true)}
            className="h-11 min-h-11 px-3 rounded-lg border-border text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary"
            title="Domínios e Hospedagem"
          >
            <Globe className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Domínio</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="h-11 min-h-11 px-3 rounded-lg border-border text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Eye className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">{isPreviewMode ? "Editar" : "Preview"}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSaveDocument}
            disabled={isSaving || isPublishing}
            variant="outline"
            className="h-11 min-h-11 px-3 sm:px-4 rounded-lg border-border font-semibold text-xs transition-transform active:scale-95 shadow-xs focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Save className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">{isSaving ? "Salvando..." : "Salvar"}</span>
          </Button>

          {onPublish && (
            <Button
              size="sm"
              onClick={handlePublishDocument}
              disabled={isPublishing || isSaving}
              className="h-11 min-h-11 px-3 sm:px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs transition-transform active:scale-95 shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Send className="size-4 sm:mr-2" />
              <span>{isPublishing ? "Publicando..." : "Publicar"}</span>
            </Button>
          )}
        </div>
      </header>

      {/* ── 1. EXPERIÊNCIA DESKTOP (WIX STUDIO DOCKED RAIL + PAINÉIS + SPLIT IA + CANVAS + 3-TAB INSPECTOR) ── */}
      <div className="hidden md:flex flex-1 overflow-hidden relative">
        {/* 1A. Barra de Ícones Acoplada à Esquerda (Wix Studio Docked Rail) */}
        {!isPreviewMode && (
          <BuilderDockedRail
            activePanel={dockedPanel}
            nodesCount={document.blocks.length}
            onTogglePanel={(panel) => {
              if (panel === "apps") {
                setIsAppMarketOpen(true);
                return;
              }
              if (panel === "code") {
                setEditorMode((prev) => (prev === "split" ? "visual" : "split"));
                return;
              }
              setDockedPanel(panel);
            }}
          />
        )}

        {/* 1B. Painel Flutuante de 3 Colunas estilo Wix Studio (+ Adicionar Elementos) */}
        {!isPreviewMode && (
          <BuilderAddPanel3Col
            isOpen={isAddPanel3ColOpen}
            onClose={() => setIsAddPanel3ColOpen(false)}
            onSelectTemplate={(tpl) => {
              handleAddBlock((tpl as any).type || (tpl as any).blocks?.[0]?.type || "bento_asymmetric_grid");
              setIsAddPanel3ColOpen(false);
            }}
            onInsertSingleBlock={(blockType) => {
              handleAddBlock(blockType);
              setIsAddPanel3ColOpen(false);
            }}
          />
        )}

        {/* 1C. Gaveta Esquerda Dinâmica conforme Ícone Ativo na BuilderDockedRail */}
        {!isPreviewMode && dockedPanel === "add" && (
          <aside className="w-80 border-r border-border/80 bg-card/60 backdrop-blur-md flex flex-col shrink-0">
            {/* Abas Superiores: Blocos | Modelos + Gatilho 3 Colunas Wix */}
            <div className="p-2 border-b border-border/60 space-y-2 bg-muted/20">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setLeftTab("blocks")}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    leftTab === "blocks" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  Blocos
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab("templates")}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    leftTab === "templates" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  Modelos
                </button>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsAddPanel3ColOpen(!isAddPanel3ColOpen)}
                className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-3.5" />
                <span>Catálogo 3 Colunas (Modo Wix +)</span>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {leftTab === "blocks" ? (
                <>
                  {/* Chips de Categorias Estilo Wix */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-1 scrollbar-none">
                    {WIX_CATEGORY_CONFIG.map((cat) => {
                      const CatIcon = cat.icon;
                      const isActive = activeBlockCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveBlockCategory(cat.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0 transition-colors cursor-pointer ${
                            isActive
                              ? "bg-foreground text-background shadow-xs"
                              : "bg-muted/50 text-muted-foreground hover:text-foreground"
                          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                        >
                          <CatIcon className="size-3" />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {filteredBlocks.map((block) => {
                    const Icon = BLOCK_ICONS[block.id] || LayoutTemplate;
                    return (
                      <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                        key={block.id}
                        onClick={() => handleAddBlock(block.id)}
                        className="p-3 rounded-lg border border-border/70 bg-card hover:border-foreground/30 hover:shadow-xs transition-colors duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground">
                              <Icon className="size-3.5" />
                            </div>
                            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                              {block.name}
                            </span>
                          </div>
                          <Plus className="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 pl-8">
                          {block.description}
                        </p>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="space-y-3">
                  <StudioTemplateFactory onApply={handleApplyStudioManifest} />
                  {STUDIO_TEMPLATE_CATALOG.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-3 rounded-lg border border-border/70 bg-card hover:border-foreground/30 hover:shadow-xs transition-colors duration-200 group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {tpl.name}
                        </span>
                        <span className="text-xs text-muted-foreground/75 px-2 py-1 rounded bg-muted text-muted-foreground font-semibold">
                          {tpl.badge}
                        </span>
                      </div>
                      {tpl.status === "review_required" && (
                        <span className="mb-2 inline-flex rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground border border-border">
                          Revisar conteúdo antes de publicar
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                        {tpl.description}
                      </p>
                      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewTemplate(tpl)}
                          className="h-11 min-h-11 px-2 text-xs text-muted-foreground/75 font-semibold gap-1 rounded-lg flex-1 cursor-pointer"
                        >
                          <Eye className="size-3" />
                          <span>Ver ao Vivo</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleApplyTemplate(tpl.id)}
                          className="h-11 min-h-11 px-2 text-xs text-muted-foreground/75 font-bold rounded-lg flex-1 bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                        >
                          <span>Usar Modelo</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* 1D. Painel de Camadas & Árvore DOM (Page > Section > Block) */}
        {!isPreviewMode && dockedPanel === "layers" && (
          <aside className="w-80 border-r border-border/80 bg-card flex flex-col shrink-0">
            <div className="p-4 border-b border-border/80 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Layers className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Camadas e Hierarquia</h3>
                  <p className="text-xs text-muted-foreground">
                    Página &gt; {document.blocks.length} Seção(ões)
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {document.blocks.map((block, idx) => {
                const def = getSiteBlockById(block.type);
                const isSelected = selectedBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    className={`p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                      isSelected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedBlockId(block.id)}
                      className="flex-1 text-left min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      <span className="text-xs font-mono text-muted-foreground block">
                        #{idx + 1} • {block.sectionAnchorId ? `#${block.sectionAnchorId}` : def.category}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate block">
                        {(block.config as any)?.title || def.name}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, "up")}
                        className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Subir seção"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === document.blocks.length - 1}
                        onClick={() => handleMove(idx, "down")}
                        className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Descer seção"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* 1E. Painel de Páginas + Botão para Visual Sitemap & GEO/SEO */}
        {!isPreviewMode && dockedPanel === "pages" && (
          <div className="flex flex-col border-r border-border/80 bg-card shrink-0">
            <div className="flex-1 overflow-hidden flex">
              <BuilderPagesPanel
                pages={sitePages}
                activePageId={activePageId}
                onSelectPage={(id) => setActivePageId(id)}
                onAddPage={(newPage) => {
                  const created: BuilderPageItem = {
                    id: `page_${Date.now()}`,
                    ...newPage,
                  };
                  setSitePages((prev) => [...prev, created]);
                  setActivePageId(created.id);
                }}
                onDeletePage={(id) => {
                  setSitePages((prev) => prev.filter((p) => p.id !== id));
                }}
                onDuplicatePage={(id) => {
                  const orig = sitePages.find((p) => p.id === id);
                  if (!orig) return;
                  setSitePages((prev) => [
                    ...prev,
                    {
                      ...orig,
                      id: `page_${Date.now()}`,
                      title: `${orig.title} (Cópia)`,
                      slug: `${orig.slug}-copia`,
                      is_home: false,
                    },
                  ]);
                }}
                onUpdatePageSeo={(id, seo) => {
                  setSitePages((prev) =>
                    prev.map((p) => (p.id === id ? { ...p, ...seo } : p)),
                  );
                }}
                onClose={() => setDockedPanel(null)}
              />
            </div>
            <div className="p-3 border-t border-border bg-muted/20">
              <Button
                type="button"
                onClick={() => setIsVisualSitemapOpen(true)}
                className="w-full h-11 min-h-11 rounded-lg bg-primary text-primary-foreground text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Globe className="size-4" />
                <span>Abrir Sitemap Visual & GEO/SEO</span>
              </Button>
            </div>
          </div>
        )}

        {/* 1F. Painel de Tema Global + Branded App Navigation + Button Styler + Hopp 7-Layout Matrix */}
        {!isPreviewMode && dockedPanel === "design" && (
          <div className="w-80 border-r border-border/80 bg-card flex flex-col shrink-0 overflow-y-auto">
            <BuilderGlobalThemePanel
              theme={globalTheme}
              onChangeTheme={(patch) => setGlobalTheme((prev) => ({ ...prev, ...patch }))}
              onClose={() => setDockedPanel(null)}
            />
            <div className="p-4 border-t border-border bg-muted/10">
              <WixBrandedAppAndHoppPanel
                selectedBlock={selectedBlock}
                onUpdateBlockConfig={handleUpdateConfig}
                appNavConfig={appNavConfig}
                onChangeAppNavConfig={(patch) =>
                  setAppNavConfig((prev) => ({ ...prev, ...patch }))
                }
                buttonStyler={buttonStyler}
                onChangeButtonStyler={(patch) =>
                  setButtonStyler((prev) => ({ ...prev, ...patch }))
                }
              />
            </div>
          </div>
        )}

        {/* 1G. Painel de Dados CMS + Botão para Planilha Relacional Wix CMS */}
        {!isPreviewMode && dockedPanel === "cms" && (
          <div className="flex flex-col border-r border-border/80 bg-card shrink-0">
            <div className="flex-1 overflow-hidden flex">
              <BuilderCmsPanel
                productsCount={products.length}
                collectionsCount={collections.length}
                onInsertDynamicBlock={(blockType) => handleAddBlock(blockType)}
                onClose={() => setDockedPanel(null)}
              />
            </div>
            <div className="p-3 border-t border-border bg-muted/20">
              <Button
                type="button"
                onClick={() => setIsCmsTableModalOpen(true)}
                className="w-full h-11 min-h-11 rounded-lg bg-primary text-primary-foreground text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Database className="size-4" />
                <span>Gerenciar Tabelas & Campos CMS</span>
              </Button>
            </div>
          </div>
        )}

        {/* 1H. Painel Lovable AI Squad Split Studio (quando editorMode === "split") */}
        {!isPreviewMode && editorMode === "split" && (
          <LovableAiSquadSplitPanel
            document={document}
            onAppendBlock={(newBlock) => {
              const updated: OmniPageDocument = {
                ...document,
                blocks: [...document.blocks, newBlock],
                updated_at: new Date().toISOString(),
              };
              commitDocumentChange(updated);
              setSelectedBlockId(newBlock.id);
            }}
            onOpenCodeModal={() => setIsCodeExplorerOpen(true)}
          />
        )}

        {/* Canvas Central (Área de Visualização WYSIWYG — Desktop, Tablet, Mobile & Branded Native App) */}
        <main className="flex-1 bg-muted/15 overflow-y-auto p-4 sm:p-8 flex justify-center">
          <BuilderViewportProvider
            viewport={viewport === "mobile" || viewport === "native_app" ? "mobile" : "desktop"}
            isEditorCanvas={true}
          >
          <div
            className={`transition-colors duration-200 ${
              viewport === "native_app"
                ? "w-full max-w-sm min-h-dvh rounded-3xl border-4 border-foreground/20 overflow-hidden bg-background my-auto flex flex-col"
                : viewport === "mobile"
                  ? "w-full max-w-sm min-h-dvh rounded-lg border border-border/80 overflow-hidden bg-background my-auto"
                  : viewport === "tablet"
                    ? "w-full max-w-3xl bg-background rounded-xl border border-border/70"
                    : "w-full max-w-6xl bg-background rounded-lg border border-border/60"
            }`}
          >
            {/* Moldura Superior de App Nativo (Dynamic Island + Top Tab Bar opcional) */}
            {viewport === "native_app" && (
              <div className="bg-card border-b border-border px-4 py-2 space-y-2 shrink-0">
                <div className="w-24 h-2 rounded-full bg-foreground/20 mx-auto" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground truncate">
                    {document.title}
                  </span>
                  <span className="text-xs font-mono text-primary">PWA Nativo</span>
                </div>
                {appNavConfig.barPosition === "top" && (
                  <div className="flex items-center justify-around gap-1 pt-1 border-t border-border/60">
                    {appNavConfig.tabs.map((tab, idx) => (
                      <div
                        key={tab}
                        className={`py-1 px-2 rounded text-center text-xs font-semibold ${
                          idx === 0 ? "bg-primary/15 text-primary font-bold" : "text-muted-foreground"
                        }`}
                      >
                        {appNavConfig.showLabelsUnderIcons ? tab : "•"}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1">
              {document.blocks.length === 0 ? (
                <div className="py-24 text-center p-8 flex flex-col items-center">
                  <LayoutTemplate className="size-8 text-muted-foreground/30 mb-3" />
                  <p className="text-xs font-semibold text-foreground mb-4">Página vazia</p>
                  <Button onClick={() => handleApplyTemplate("template_gastronomy")} size="sm" variant="outline" className="h-11 min-h-11 rounded-lg text-xs">
                    Carregar Modelo Base
                  </Button>
                </div>
              ) : (
                document.blocks.map((block, index) => {
                  const def = getSiteBlockById(block.type);
                  const Component = def.component;
                  const isSelected = selectedBlockId === block.id && !isPreviewMode;

                  return (
                    <div
                      key={block.id} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!isPreviewMode) setSelectedBlockId(block.id); } }} onClick={() => !isPreviewMode && setSelectedBlockId(block.id)} className={`relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background z-20" : ""
                      }`}
                    >
                      {/* Barra Flutuante de Ações no Bloco (Desktop Hover) */}
                      {!isPreviewMode && (
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 backdrop-blur-md border border-border/80 rounded-lg p-1 shadow-xs flex items-center gap-1 z-30">
                          <span className="text-xs text-muted-foreground/75 font-mono text-muted-foreground px-2">
                            {def.name}
                          </span>
                          <button
                            disabled={index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(index, "up");
                            }}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title="Subir"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            disabled={index === document.blocks.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMove(index, "down");
                            }}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title="Descer"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(block.id);
                            }}
                            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title="Duplicar"
                          >
                            <Copy className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(block.id);
                            }}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title="Excluir"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}

                      <BlockErrorBoundary
                        blockId={block.id}
                        blockType={block.type}
                        onRemoveBlock={handleRemove}
                      >
                        <Component
                          id={block.id}
                          data={block.config}
                          styling={block.styling}
                          isEditing={true}
                          products={products}
                          categories={categories}
                          collections={collections} classifieds={classifieds} posts={posts} flyers={flyers} events={events} jobs={jobs} stores={stores} banners={banners} hotpages={hotpages}
                          storeData={storeData}
                          newsArticles={liveNewsArticles}
                        />
                      </BlockErrorBoundary>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Tab Bar do App Nativo (quando viewport === "native_app" e barPosition === "bottom") */}
            {viewport === "native_app" && appNavConfig.barPosition === "bottom" && (
              <div className="bg-card border-t border-border px-3 py-2 flex items-center justify-around gap-1 shrink-0">
                {appNavConfig.tabs.map((tab, idx) => (
                  <div
                    key={tab}
                    className={`py-1 px-2 rounded text-center text-xs font-semibold ${
                      idx === 0 ? "bg-primary/15 text-primary font-bold" : "text-muted-foreground"
                    }`}
                  >
                    {appNavConfig.showLabelsUnderIcons ? tab : "•"}
                  </div>
                ))}
              </div>
            )}
          </div>
          </BuilderViewportProvider>
        </main>

        {/* Painel Direito: Inspector Profundo de 3 Abas (Conteúdo | Design & Posição | Animações & CMS) */}
        {!isPreviewMode && selectedBlock && (
          <aside className="w-80 lg:w-96 border-l border-border/80 bg-card/60 backdrop-blur-md flex flex-col shrink-0">
            {/* Breadcrumb de Hierarquia de Camadas (Página > Seção > Bloco) */}
            <div className="px-4 py-2 border-b border-border/60 bg-muted/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground truncate">
                <span>Página</span>
                <ChevronRight className="size-3 shrink-0" />
                <span>Seção</span>
                <ChevronRight className="size-3 shrink-0" />
                <span className="font-bold text-foreground truncate">
                  {getSiteBlockById(selectedBlock.type).name}
                </span>
              </div>
            </div>

            {/* 3 Abas do Inspector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 p-2 border-b border-border/60 gap-1 bg-muted/20">
              <button
                type="button"
                onClick={() => setInspectorTab("content")}
                className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  inspectorTab === "content" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <Settings2 className="size-3.5" />
                <span>Conteúdo</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab("styling")}
                className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  inspectorTab === "styling" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <Palette className="size-3.5" />
                <span>Design & Pos</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab("animation_cms")}
                className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                  inspectorTab === "animation_cms" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <Sparkles className="size-3.5" />
                <span>Animação/CMS</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {inspectorTab === "content" ? (
                <div className="space-y-4">
                  {/* Ações Rápidas Wix Studio: Photo Studio Pro + Gerenciar Menu + Matriz Hopp */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsPhotoStudioOpen(true)}
                      className="h-11 min-h-11 rounded-lg text-xs font-bold gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Sparkles className="size-3.5 text-primary" />
                      <span>Photo Studio</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsMenuManagerOpen(true)}
                      className="h-11 min-h-11 rounded-lg text-xs font-bold gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MenuIcon className="size-3.5 text-primary" />
                      <span>Gerenciar Menu</span>
                    </Button>
                  </div>

                  <BlockContentFields
                    selectedBlock={selectedBlock}
                    onUpdateConfig={handleUpdateConfig}
                    onUpdateAssetRef={handleUpdateAssetRef}
                    onClearAssetRef={handleClearAssetRef}
                    onUpdateAssetAltText={handleUpdateAssetAltText}
                    unsplashUsageSlot={unsplashDecorativeSlot?.id}
                    unsplashDefaultQuery={unsplashDecorativeSlot?.searchHints[0] ?? activeStudioManifest?.niche.replace(/[-_]/g, " ")}
                    products={products}
                    categories={categories}
                    collections={collections} classifieds={classifieds} posts={posts} flyers={flyers} events={events} jobs={jobs} stores={stores} banners={banners} hotpages={hotpages}
                  />
                </div>
              ) : inspectorTab === "styling" ? (
                /* Aba 2: Design, Posição, Dimensionamento Fluido, Ancoragem 3x3 & Header Scroll */
                <div className="space-y-4">
                  <BidirectionalDeviceStylingFields
                    styling={selectedBlock.styling}
                    onUpdateStyling={handleUpdateStyling}
                    sectionAnchorId={selectedBlock.sectionAnchorId}
                    onUpdateSectionAnchorId={handleUpdateSectionAnchorId}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Espaçamento Vertical (Padding)
                    </label>
                    <select
                      value={selectedBlock.styling?.paddingY || "md"}
                      onChange={(e) => handleUpdateStyling("paddingY", e.target.value)}
                      className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs"
                    >
                      <option value="none">Sem Espaçamento</option>
                      <option value="sm">Pequeno (32px)</option>
                      <option value="md">Médio (64px)</option>
                      <option value="lg">Amplo (96px)</option>
                      <option value="xl">Monumental (128px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Arredondamento dos Cantos
                    </label>
                    <select
                      value={selectedBlock.styling?.borderRadius || "xl"}
                      onChange={(e) => handleUpdateStyling("borderRadius", e.target.value)}
                      className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs"
                    >
                      <option value="none">Reto (0px)</option>
                      <option value="sm">Pequeno (6px)</option>
                      <option value="md">Médio (8px)</option>
                      <option value="lg">Grande (12px)</option>
                      <option value="xl">Extra Grande (16px)</option>
                      <option value="2xl">Squircle Apple (24px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Cor de Fundo Customizada
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedBlock.styling?.backgroundColor || `${String.fromCharCode(35)}ffffff`}
                        onChange={(e) => handleUpdateStyling("backgroundColor", e.target.value)}
                        className="size-11 min-h-11 min-w-11 rounded-lg cursor-pointer border border-border"
                      />
                      <Input
                        value={selectedBlock.styling?.backgroundColor || ""}
                        onChange={(e) => handleUpdateStyling("backgroundColor", e.target.value)}
                        placeholder="Padrão do tema"
                        className="h-11 min-h-11 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <WixScrollAnimationsAndDockingInspector
                    section="layout"
                    selectedBlock={selectedBlock}
                    onUpdateConfig={handleUpdateConfig}
                    onUpdateStyling={handleUpdateStyling}
                  />
                </div>
              ) : (
                /* Aba 3: 12 Animações de Rolagem Wix Studio & Conexão de Dataset CMS */
                <WixScrollAnimationsAndDockingInspector
                  section="animation_cms"
                  selectedBlock={selectedBlock}
                  onUpdateConfig={handleUpdateConfig}
                  onUpdateStyling={handleUpdateStyling}
                  onOpenCmsTable={() => setIsCmsTableModalOpen(true)}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── 2. EXPERIÊNCIA MOBILE (CANVAS CONSOME A TELA TODA + BARRA INFERIOR FLUTUANTE) ── */}
      <BuilderViewportProvider viewport="mobile" isEditorCanvas={true}>
      <div className="flex md:hidden flex-1 flex-col overflow-y-auto relative pb-28">
        {document.blocks.length === 0 ? (
          <div className="py-24 text-center p-6 flex flex-col items-center justify-center flex-1">
            <LayoutTemplate className="size-8 text-muted-foreground/30 mb-3" />
            <p className="text-xs font-semibold text-foreground mb-4">Página vazia</p>
            <Button
              onClick={() => handleApplyTemplate("template_gastronomy")}
              size="sm"
              variant="outline"
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold"
            >
              Carregar Modelo Base
            </Button>
          </div>
        ) : (
          <div className="space-y-4 px-2 py-3">
            {document.blocks.map((block) => {
              const def = getSiteBlockById(block.type);
              const Component = def.component;
              const isSelected = selectedBlockId === block.id && !isPreviewMode;

              return (
                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                  key={block.id}
                  onClick={() => {
                    if (!isPreviewMode) {
                      setSelectedBlockId(block.id);
                    }
                  }}
                  className={`relative rounded-lg overflow-hidden transition-colors duration-200 ${
                    isSelected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  {/* Tag do Bloco Ativo no Mobile */}
                  {isSelected && (
                    <div className="absolute top-2 left-2 z-30 bg-background/95 backdrop-blur-md border border-border/80 rounded-lg px-2 py-1 shadow-xs flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
                      <span className="text-xs text-muted-foreground/75 font-bold text-foreground">{def.name}</span>
                    </div>
                  )}

                  <BlockErrorBoundary
                    blockId={block.id}
                    blockType={block.type}
                    onRemoveBlock={handleRemove}
                  >
                    <Component
                      id={block.id}
                      data={block.config}
                      styling={block.styling}
                      isEditing={true}
                      products={products}
                      categories={categories}
                      collections={collections} classifieds={classifieds} posts={posts} flyers={flyers} events={events} jobs={jobs} stores={stores} banners={banners} hotpages={hotpages}
                      storeData={storeData}
                      newsArticles={liveNewsArticles}
                    />
                  </BlockErrorBoundary>
                </div>
              );
            })}
          </div>
        )}

        {/* Barra Inferior Flutuante (Floating Bottom Bar - 44px Touch Targets) */}
        {!isPreviewMode && (
          <div className="fixed bottom-3 left-3 right-3 z-40 bg-card/95 backdrop-blur-xl border border-border/80 rounded-lg shadow-xl p-2 flex items-center justify-around">
            <button
              onClick={() => setIsMobileAddOpen(true)}
              className="h-11 flex-1 flex flex-col items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" />
              <span className="text-xs text-muted-foreground/75 font-semibold mt-1">Blocos</span>
            </button>

            <button
              onClick={() => {
                if (!selectedBlockId && document.blocks[0]) {
                  setSelectedBlockId(document.blocks[0].id);
                }
                setIsMobileSheetOpen(true);
              }}
              disabled={document.blocks.length === 0}
              className="h-11 flex-1 flex flex-col items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:bg-muted/60 transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Settings2 className="size-4" />
              <span className="text-xs text-muted-foreground/75 font-semibold mt-1">Editar</span>
            </button>

            <button
              onClick={() => setIsMobileTemplateOpen(true)}
              className="h-11 flex-1 flex flex-col items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LayoutTemplate className="size-4" />
              <span className="text-xs text-muted-foreground/75 font-semibold mt-1">Modelos</span>
            </button>

            <button
              onClick={() => setIsMobileLayersOpen(true)}
              disabled={document.blocks.length === 0}
              className="h-11 flex-1 flex flex-col items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:bg-muted/60 transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Layers className="size-4" />
              <span className="text-xs text-muted-foreground/75 font-semibold mt-1">Ordem</span>
            </button>
          </div>
        )}
      </div>

      </BuilderViewportProvider>
      {/* ── MOBILE BOTTOM SHEET: ADICIONAR BLOCO (85vh) ── */}
      <Sheet open={isMobileAddOpen} onOpenChange={setIsMobileAddOpen}>
        <SheetContent side="bottom" className="h-5/6 rounded-t-lg p-5 flex flex-col">
          <SheetHeader className="mb-2">
            <SheetTitle className="text-sm font-bold tracking-tight">Adicionar Bloco</SheetTitle>
          </SheetHeader>

          {/* Chips de filtro de categoria Wix no Mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none shrink-0">
            {WIX_CATEGORY_CONFIG.map((cat) => {
              const CatIcon = cat.icon;
              const isActive = activeBlockCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveBlockCategory(cat.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? "bg-foreground text-background shadow-xs"
                      : "bg-muted/60 text-muted-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <CatIcon className="size-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredBlocks.map((block) => {
              const Icon = BLOCK_ICONS[block.id] || LayoutTemplate;
              return (
                <div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }}
                  key={block.id}
                  onClick={() => handleAddBlock(block.id)}
                  className="p-3 rounded-lg border border-border/70 bg-card active:bg-muted/60 flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{block.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {block.description}
                      </p>
                    </div>
                  </div>
                  <Plus className="size-4 text-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── MOBILE BOTTOM SHEET: EDITAR BLOCO SELECIONADO (85vh - CONTEÚDO & ESTILO) ── */}
      <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
        <SheetContent side="bottom" className="h-5/6 rounded-t-lg p-5 flex flex-col">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-sm font-bold tracking-tight">
              {selectedBlock ? getSiteBlockById(selectedBlock.type).name : "Editar Bloco"}
            </SheetTitle>
          </SheetHeader>

          {selectedBlock ? (
            <div className="flex-1 overflow-y-auto space-y-4 pb-6">
              {/* Abas Conteúdo / Estilo */}
              <div className="grid grid-cols-2 p-1 bg-muted/40 rounded-lg border border-border/60 gap-1">
                <button
                  onClick={() => setMobileInspectorTab("content")}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    mobileInspectorTab === "content"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <Settings2 className="size-4" />
                  Conteúdo
                </button>
                <button
                  onClick={() => setMobileInspectorTab("styling")}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    mobileInspectorTab === "styling"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <Palette className="size-4" />
                  Estilo
                </button>
              </div>

              {mobileInspectorTab === "content" ? (
                <div className="pt-1">
                  <BlockContentFields
                    selectedBlock={selectedBlock}
                    onUpdateConfig={handleUpdateConfig}
                    onUpdateAssetRef={handleUpdateAssetRef}
                    onClearAssetRef={handleClearAssetRef}
                    onUpdateAssetAltText={handleUpdateAssetAltText}
                    unsplashUsageSlot={unsplashDecorativeSlot?.id}
                    unsplashDefaultQuery={unsplashDecorativeSlot?.searchHints[0] ?? activeStudioManifest?.niche.replace(/[-_]/g, " ")}
                    products={products}
                    categories={categories}
                    collections={collections} classifieds={classifieds} posts={posts} flyers={flyers} events={events} jobs={jobs} stores={stores} banners={banners} hotpages={hotpages}
                  />
                </div>
              ) : (
                /* Aba de Estilo Mobile */
                <div className="space-y-4 pt-1">
                  <BidirectionalDeviceStylingFields
                    styling={selectedBlock.styling}
                    onUpdateStyling={handleUpdateStyling}
                    sectionAnchorId={selectedBlock.sectionAnchorId}
                    onUpdateSectionAnchorId={handleUpdateSectionAnchorId}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Espaçamento Vertical (Padding)
                    </label>
                    <select
                      value={selectedBlock.styling?.paddingY || "md"}
                      onChange={(e) => handleUpdateStyling("paddingY", e.target.value)}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs"
                    >
                      <option value="none">Sem Espaçamento</option>
                      <option value="sm">Pequeno (32px)</option>
                      <option value="md">Médio (64px)</option>
                      <option value="lg">Amplo (96px)</option>
                      <option value="xl">Monumental (128px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Arredondamento dos Cantos
                    </label>
                    <select
                      value={selectedBlock.styling?.borderRadius || "xl"}
                      onChange={(e) => handleUpdateStyling("borderRadius", e.target.value)}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-xs"
                    >
                      <option value="none">Reto (0px)</option>
                      <option value="sm">Discreto (8px)</option>
                      <option value="md">Médio (12px)</option>
                      <option value="xl">Arredondado (16px)</option>
                      <option value="2xl">Padrão Apple (24px)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Cor de Fundo Customizada
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedBlock.styling?.backgroundColor || `${String.fromCharCode(35)}ffffff`}
                        onChange={(e) => handleUpdateStyling("backgroundColor", e.target.value)}
                        className="size-10 rounded-lg cursor-pointer border border-border"
                      />
                      <Input
                        value={selectedBlock.styling?.backgroundColor || ""}
                        onChange={(e) => handleUpdateStyling("backgroundColor", e.target.value)}
                        placeholder="Padrão do tema"
                        className="h-10 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setIsMobileSheetOpen(false)}
                className="w-full h-11 rounded-lg bg-foreground text-background font-bold mt-4"
              >
                Concluir
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-muted-foreground">
              Selecione um bloco no canvas para editar.
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── MOBILE BOTTOM SHEET: MODELOS PRONTOS (85vh) ── */}
      <Sheet open={isMobileTemplateOpen} onOpenChange={setIsMobileTemplateOpen}>
        <SheetContent side="bottom" className="h-5/6 rounded-t-lg p-5 flex flex-col">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-sm font-bold tracking-tight">Modelos de Página</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-3">
            <StudioTemplateFactory onApply={(template) => {
              handleApplyStudioManifest(template);
              setIsMobileTemplateOpen(false);
            }} />
            {STUDIO_TEMPLATE_CATALOG.map((tpl) => (
              <div
                key={tpl.id}
                className="p-4 rounded-lg border border-border/70 bg-card transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-foreground">{tpl.name}</h4>
                  <span className="text-xs text-muted-foreground/75 px-2 py-1 rounded bg-muted text-muted-foreground font-semibold">
                    {tpl.badge}
                  </span>
                </div>
                {tpl.status === "review_required" && (
                  <span className="mb-2 inline-flex rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground border border-border">
                    Revisar antes de publicar
                  </span>
                )}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {tpl.description}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPreviewTemplate(tpl);
                      setIsMobileTemplateOpen(false);
                    }}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 rounded-lg flex-1 cursor-pointer focus-visible:ring-2"
                  >
                    <Eye className="size-3.5" />
                    <span>Visualizar</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      handleApplyTemplate(tpl.id);
                      setIsMobileTemplateOpen(false);
                    }}
                    className="h-11 min-h-11 px-3 text-xs font-bold rounded-lg flex-1 bg-foreground text-background cursor-pointer focus-visible:ring-2"
                  >
                    <span>Usar Modelo</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── MOBILE BOTTOM SHEET: ORDEM & GESTÃO DE BLOCOS (85vh) ── */}
      <Sheet open={isMobileLayersOpen} onOpenChange={setIsMobileLayersOpen}>
        <SheetContent side="bottom" className="h-5/6 rounded-t-lg p-5 flex flex-col">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-sm font-bold tracking-tight">
              Estrutura ({document.blocks.length} Blocos)
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {document.blocks.map((block, index) => {
              const def = getSiteBlockById(block.type);
              const title = (block.config as any).title || def.name;

              return (
                <div
                  key={block.id}
                  className="p-3 rounded-lg border border-border/80 bg-card flex items-center justify-between shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBlockId(block.id);
                      setIsMobileLayersOpen(false);
                    }}
                    className="flex-1 pr-2 cursor-pointer min-w-0 text-left focus-visible:ring-2 rounded-md"
                  >
                    <span className="text-xs text-muted-foreground/75 font-mono text-muted-foreground uppercase tracking-wider block">
                      {def.name}
                    </span>
                    <h4 className="text-xs font-bold text-foreground truncate">{title}</h4>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, "up")}
                      className="size-11 min-h-11 min-w-11 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground disabled:opacity-30 focus-visible:ring-2"
                      title="Subir"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === document.blocks.length - 1}
                      onClick={() => handleMove(index, "down")}
                      className="size-11 min-h-11 min-w-11 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground disabled:opacity-30 focus-visible:ring-2"
                      title="Descer"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(block.id)}
                      className="size-11 min-h-11 min-w-11 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground focus-visible:ring-2"
                      title="Duplicar"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(block.id)}
                      className="size-11 min-h-11 min-w-11 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive focus-visible:ring-2"
                      title="Excluir"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── MODAL DE LIVE PREVIEW DE TEMPLATE (FASE 3 - TRY BEFORE YOU BUY) ── */}
      <LiveTemplatePreviewModal
        template={previewTemplate}
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onSelectTemplate={(tplId) => {
          handleApplyTemplate(tplId);
          setPreviewTemplate(null);
        }}
      />

      {/* ── MODAL DE DOMÍNIOS & HOSPEDAGEM (OFFLOAD LITESPEED / FREE SUBDOMAIN) ── */}
      <HostingDomainConnectModal
        isOpen={isDomainModalOpen}
        onClose={() => setIsDomainModalOpen(false)}
        storeSlug={document.slug}
        storeName={document.title || "Minha Loja"}
      />

      {/* MODAL DO EXPLORADOR DE CÓDIGO TANSTACK START (LOVABLE PARITY) */}
      {isCodeExplorerOpen && (
        <BuilderCodeExplorerModal
          isOpen={isCodeExplorerOpen}
          onClose={() => setIsCodeExplorerOpen(false)}
          document={document}
        />
      )}

      {/* MODAL DO OMNI APPS MARKET (WIX APPS PARITY) */}
      {isAppMarketOpen && (
        <OmniAppMarketModal
          isOpen={isAppMarketOpen}
          onClose={() => setIsAppMarketOpen(false)}
          storeId={document.store_id}
          onAppInstalled={(appId) => {
            toast.success("App instalado. Atualizando árvore de páginas...");
          }}
        />
      )}

      {/* MODAL DO PHOTO STUDIO PRO (WIX PHOTO STUDIO PARITY) */}
      {isPhotoStudioOpen && (
        <PhotoStudioModal
          isOpen={isPhotoStudioOpen}
          onClose={() => setIsPhotoStudioOpen(false)}
          imageUrl={
            (selectedBlock?.config as any)?.imageUrl ||
            (selectedBlock?.config as any)?.coverImageUrl ||
            ""
          }
          onSaveImage={(newUrl, adjustments) => {
            if (selectedBlock) {
              handleUpdateConfig("photoAdjustments", adjustments);
              if (newUrl) handleUpdateConfig("imageUrl", newUrl);
            }
          }}
        />
      )}

      {/* MODAL DO VISUAL SITEMAP & GEO/SEO INSPECTOR */}
      {isVisualSitemapOpen && (
        <WixVisualSitemapModal
          isOpen={isVisualSitemapOpen}
          onClose={() => setIsVisualSitemapOpen(false)}
          pages={sitePages}
          activePageId={activePageId}
          onSelectPage={(id) => setActivePageId(id)}
          onAddPage={(newPage) => {
            const created: BuilderPageItem = {
              id: `page_${Date.now()}`,
              ...newPage,
            };
            setSitePages((prev) => [...prev, created]);
            setActivePageId(created.id);
          }}
          onDuplicatePage={(id) => {
            const orig = sitePages.find((p) => p.id === id);
            if (!orig) return;
            setSitePages((prev) => [
              ...prev,
              {
                ...orig,
                id: `page_${Date.now()}`,
                title: `${orig.title} (Cópia)`,
                slug: `${orig.slug}-copia`,
                is_home: false,
              },
            ]);
          }}
          onUpdatePageSeo={(id, seo) => {
            setSitePages((prev) =>
              prev.map((p) => (p.id === id ? { ...p, ...seo } : p)),
            );
          }}
          currentDocumentBlocks={document.blocks}
        />
      )}

      {/* DRAWER DO GERENCIADOR DE MENU (MANAGE MENU) */}
      <WixMenuManagerDrawer
        isOpen={isMenuManagerOpen}
        onClose={() => setIsMenuManagerOpen(false)}
        onApplyMenuToBlock={(items, menuType) => {
          if (selectedBlock) {
            handleUpdateConfig("menuItems", items);
            handleUpdateConfig("menuType", menuType);
          }
        }}
      />

      {/* MODAL DE PLANILHA RELACIONAL DO CMS & MANAGE FIELDS */}
      {isCmsTableModalOpen && (
        <WixCmsCollectionManagerModal
          isOpen={isCmsTableModalOpen}
          onClose={() => setIsCmsTableModalOpen(false)}
          productsCount={products.length}
          onInsertCollectionBlock={(blockType) => handleAddBlock(blockType)}
        />
      )}
    </div>
  );
};

export const WaesyBuilder = OmniEditor;
export type WaesyBuilderProps = OmniEditorProps;
