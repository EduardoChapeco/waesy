/**
 * universal-block-inspector.tsx — Inspetor Contextual Universal Orientado a Capacidades
 * Padrão Wix Studio & Apple HIG (Paridade WYSIWYG, Zero AI-Smell, 6 Categorias Semânticas).
 */

import React, { useState } from "react";
import {
  Type,
  Layout,
  Palette,
  Database,
  Zap,
  Sliders,
  Smartphone,
  Layers,
  X,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Table as TableIcon,
  Sparkles,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MediaUploader } from "@/components/admin/builder/MediaUploader";
import type {
  OmniBlockInstance,
  OmniBlockStyling,
  BlockCapabilities,
  BlockDataBinding,
} from "@/types/omni-builder";
import type { SiteBuilderBlockDefinition } from "./types";

export type UniversalInspectorTab =
  | "content"
  | "layout"
  | "design"
  | "data"
  | "interactions"
  | "responsive";

export interface UniversalBlockInspectorProps {
  selectedBlock: OmniBlockInstance;
  blockDef: SiteBuilderBlockDefinition;
  onUpdateConfig: (partialConfig: Record<string, any>) => void;
  onUpdateStyling: (partialStyling: Partial<OmniBlockStyling>) => void;
  onUpdateBinding: (binding: BlockDataBinding) => void;
  onUpdateSectionAnchorId?: (anchorId: string) => void;
  onUpdateSubstate?: (substate: string) => void;
  onToggleHidden?: (hidden: boolean) => void;
  onOpenCollectionSheet?: () => void;
  onOpenPhotoStudio?: () => void;
  onClose?: () => void;
  contentSlot?: React.ReactNode;
  products?: any[];
  categories?: any[];
  collections?: any[];
  stores?: any[];
}

function getDynamicDataSourceForBlock(blockType: string): string {
  switch (blockType) {
    case "vitrine_product_shelf":
      return "store_products";
    case "vitrine_metamorphic_banner":
      return "store_banners";
    case "vitrine_classifieds_rail":
      return "store_classifieds";
    case "vitrine_social_stream":
      return "store_posts";
    case "vitrine_ecosystem_rail":
      return "live_ecosystem";
    case "vitrine_vertical_carousel":
      return "store_flyers";
    case "vitrine_buttons_dock":
      return "store_categories";
    default:
      return "dynamic";
  }
}

export const UniversalBlockInspector: React.FC<UniversalBlockInspectorProps> = ({
  selectedBlock,
  blockDef,
  onUpdateConfig,
  onUpdateStyling,
  onUpdateBinding,
  onUpdateSectionAnchorId,
  onUpdateSubstate,
  onToggleHidden,
  onOpenCollectionSheet,
  onOpenPhotoStudio,
  onClose,
  contentSlot,
  products = [],
  categories = [],
  collections = [],
  stores = [],
}) => {
  const [activeTab, setActiveTab] = useState<UniversalInspectorTab>("content");
  const config = selectedBlock.config || {};
  const styling = selectedBlock.styling || {};
  const binding = selectedBlock.dataBinding || {};

  const collectionArrayKeys = [
    "items",
    "slides",
    "tiles",
    "cells",
    "tiers",
    "testimonials",
    "steps",
    "tabs",
    "options",
    "articles",
    "sections",
  ];
  const activeCollectionKey = collectionArrayKeys.find((k) => Array.isArray(config[k]));
  const activeCollectionCount = activeCollectionKey ? (config[activeCollectionKey] || []).length : 0;

  // Extração normalizada de capabilities
  const rawCaps = blockDef?.capabilities || selectedBlock.capabilities;
  const capabilities: BlockCapabilities = React.useMemo(() => {
    const inferredSubstates =
      selectedBlock.type === "vitrine_lateral_drawer"
        ? ["drawer_closed", "drawer_open"]
        : selectedBlock.type === "vitrine_ifood_header"
          ? ["header_default", "header_search_open"]
          : selectedBlock.type === "contact_form_direct" ||
              selectedBlock.type === "interactive_lead_quiz_flow" ||
              selectedBlock.type === "interactive_quote_calculator"
            ? ["default", "submitted"]
            : selectedBlock.type.includes("accordion")
              ? ["item_collapsed", "item_expanded"]
              : [];

    if (rawCaps && typeof rawCaps === "object" && !Array.isArray(rawCaps)) {
      return {
        text: true,
        background: true,
        media: false,
        animation: true,
        layout: true,
        responsive: true,
        dataBinding: false,
        interactions: true,
        visibility: true,
        collectionManager: Boolean(activeCollectionKey),
        substates:
          rawCaps.substates && rawCaps.substates.length > 0
            ? rawCaps.substates
            : inferredSubstates,
        ...rawCaps,
      };
    }
    const arr = Array.isArray(rawCaps) ? rawCaps : [];
    return {
      text: true,
      background: true,
      media: arr.includes("media"),
      animation: true,
      layout: true,
      responsive: true,
      dataBinding: arr.includes("cms") || arr.includes("commerce"),
      interactions: true,
      visibility: true,
      collectionManager: Boolean(activeCollectionKey),
      substates: inferredSubstates,
    };
  }, [rawCaps, activeCollectionKey, selectedBlock.type]);

  const isDynamicFeeding = Boolean(
    binding.entity ||
      (typeof config.dataSource === "string" && config.dataSource !== "manual"),
  );

  const tabs: Array<{ id: UniversalInspectorTab; label: string; icon: React.ElementType; enabled: boolean }> = [
    { id: "content", label: "Conteúdo", icon: Type, enabled: true },
    { id: "data", label: "Dados", icon: Database, enabled: true },
    { id: "design", label: "Aparência", icon: Palette, enabled: Boolean(capabilities.background) },
    { id: "layout", label: "Layout", icon: Layout, enabled: Boolean(capabilities.layout) },
    { id: "interactions", label: "Comportamento", icon: Zap, enabled: true },
    { id: "responsive", label: "Avançado", icon: Smartphone, enabled: true },
  ];

  return (
    <aside className="w-80 sm:w-96 bg-card border-l border-border/80 flex flex-col flex-none h-full select-none shadow-overlay z-20 animate-in fade-in duration-200">
      {/* ── 1. Cabeçalho do Bloco Selecionado ── */}
      <div className="p-4 border-b border-border/60 flex items-center justify-between gap-3 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sliders className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-foreground truncate">
              {blockDef?.name || selectedBlock.type}
            </h3>
            <p className="text-2xs text-muted-foreground truncate font-mono">
              {selectedBlock.id}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="size-11 min-h-11 min-w-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Fechar painel de propriedades"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* ── 2. Abas de Categorias do Inspetor (Padrão Wix Studio) ── */}
      <nav
        aria-label="Categorias do Inspetor"
        /* design-lint-ignore DL-30 reason:"Barra horizontal de abas do inspetor com rolagem por toque" expiry:"2027-12-31" */
        className="flex items-center p-1 bg-muted/40 border-b border-border/60 overflow-x-auto no-scrollbar gap-1"
      >
        {tabs
          .filter((t) => t.enabled)
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-2xs font-bold transition-colors whitespace-nowrap min-h-11 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
      </nav>

      {/* ── 3. Corpo das Propriedades ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ── ABA 1: CONTEÚDO ── */}
        {activeTab === "content" && (
          <div className="space-y-4">
            {contentSlot ? (
              contentSlot
            ) : (
              <>
                {"title" in config || "sectionTitle" in config ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Título da Seção</Label>
                    <Input
                      value={config.title ?? config.sectionTitle ?? ""}
                      onChange={(e) =>
                        onUpdateConfig(
                          "sectionTitle" in config
                            ? { sectionTitle: e.target.value }
                            : { title: e.target.value },
                        )
                      }
                      placeholder="Ex: Ofertas da Semana"
                      className="h-11 min-h-11 text-xs rounded-xl"
                    />
                  </div>
                ) : null}

                {"subtitle" in config || "sectionSubtitle" in config ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Subtítulo / Descrição</Label>
                    <Textarea
                      value={config.subtitle ?? config.sectionSubtitle ?? ""}
                      onChange={(e) =>
                        onUpdateConfig(
                          "sectionSubtitle" in config
                            ? { sectionSubtitle: e.target.value }
                            : { subtitle: e.target.value },
                        )
                      }
                      placeholder="Ex: Produtos com descontos exclusivos na sua cidade"
                      className="text-xs rounded-xl min-h-20"
                    />
                  </div>
                ) : null}

                {"badge" in config || "promoBadge" in config ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Selo / Tag Promocional</Label>
                    <Input
                      value={config.badge ?? config.promoBadge ?? ""}
                      onChange={(e) =>
                        onUpdateConfig(
                          "promoBadge" in config
                            ? { promoBadge: e.target.value }
                            : { badge: e.target.value },
                        )
                      }
                      placeholder="Ex: Destaque ou -20% OFF"
                      className="h-11 min-h-11 text-xs rounded-xl"
                    />
                  </div>
                ) : null}

                {"ctaLabel" in config || "ctaText" in config ? (
                  <div className="space-y-3 pt-2 border-t border-border/40">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-foreground">Rótulo do Botão (CTA)</Label>
                      <Input
                        value={config.ctaLabel ?? config.ctaText ?? ""}
                        onChange={(e) =>
                          onUpdateConfig(
                            "ctaText" in config
                              ? { ctaText: e.target.value }
                              : { ctaLabel: e.target.value },
                          )
                        }
                        placeholder="Ex: Ver Todas as Ofertas"
                        className="h-11 min-h-11 text-xs rounded-xl"
                      />
                    </div>
                    {"targetUrl" in config || "ctaUrl" in config || "href" in config ? (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-foreground">Destino do Link</Label>
                        <Input
                          value={config.targetUrl ?? config.ctaUrl ?? config.href ?? ""}
                          onChange={(e) =>
                            onUpdateConfig(
                              "targetUrl" in config
                                ? { targetUrl: e.target.value }
                                : "ctaUrl" in config
                                  ? { ctaUrl: e.target.value }
                                  : { href: e.target.value },
                            )
                          }
                          placeholder="Ex: /gastronomia ou https://..."
                          className="h-11 min-h-11 text-xs rounded-xl"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {"imageUrl" in config || "coverImageUrl" in config || "backgroundImageUrl" in config ? (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Imagem de Capa</span>
                      <ImageIcon className="size-3.5 text-muted-foreground" />
                    </Label>
                    <MediaUploader
                      value={
                        config.imageUrl ?? config.coverImageUrl ?? config.backgroundImageUrl ?? ""
                      }
                      onChange={(url: string) => {
                        onUpdateConfig(
                          "coverImageUrl" in config
                            ? { coverImageUrl: url }
                            : "backgroundImageUrl" in config
                              ? { backgroundImageUrl: url }
                              : { imageUrl: url },
                        );
                      }}
                    />
                  </div>
                ) : null}
              </>
            )}

            {/* Estúdio de Imagem quando houver URL de capa */}
            {onOpenPhotoStudio &&
              Boolean(config.imageUrl || config.coverImageUrl || config.backgroundImageUrl) && (
                <div className="pt-3 border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onOpenPhotoStudio}
                    className="w-full h-11 min-h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="size-4" />
                    <span>Ajustar Imagem no Photo Studio</span>
                  </Button>
                </div>
              )}

            {/* Acesso rápido ao Editor de Planilha / Sheet */}
            {activeCollectionKey && onOpenCollectionSheet && (
              <div className="pt-4 border-t border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Itens da Coleção</span>
                  <Badge variant="outline" className="text-2xs font-mono">
                    {activeCollectionCount} itens
                  </Badge>
                </div>
                <p className="text-2xs text-muted-foreground">
                  Gerencie botões, cards, slides ou opções em lote em formato de planilha.
                </p>
                <Button
                  type="button"
                  onClick={onOpenCollectionSheet}
                  className="w-full h-11 min-h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <TableIcon className="size-4" />
                  <span>Editar Itens em Planilha (Modo Sheet)</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── ABA 2: LAYOUT ── */}
        {activeTab === "layout" && (
          <div className="space-y-4">
            {/* Espaçamento Vertical */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Espaçamento Vertical (Padding Y)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(["none", "sm", "md", "lg", "xl"] as const).map((pad) => (
                  <button
                    key={pad}
                    type="button"
                    onClick={() =>
                      onUpdateStyling({
                        paddingY: pad,
                        paddingTop: undefined,
                        paddingBottom: undefined,
                      })
                    }
                    className={cn(
                      "h-11 min-h-11 rounded-xl border text-xs font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      (styling.paddingY || "md") === pad
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-muted text-muted-foreground",
                    )}
                  >
                    {pad}
                  </button>
                ))}
              </div>
            </div>

            {/* Largura Máxima do Contêiner */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Largura Máxima da Seção</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["md", "xl", "7xl", "full"] as const).map((mw) => (
                  <button
                    key={mw}
                    type="button"
                    onClick={() => onUpdateStyling({ maxWidth: mw })}
                    className={cn(
                      "h-11 min-h-11 rounded-xl border text-xs font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      (styling.maxWidth || "7xl") === mw
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-muted text-muted-foreground",
                    )}
                  >
                    {mw === "full" ? "100%" : mw}
                  </button>
                ))}
              </div>
            </div>

            {/* Colunas Desktop */}
            {"desktopColumns" in config && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Colunas no Desktop</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[2, 3, 4, 6].map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => onUpdateConfig({ desktopColumns: cols })}
                      className={cn(
                        "h-11 min-h-11 rounded-xl border text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        config.desktopColumns === cols
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 hover:bg-muted text-muted-foreground",
                      )}
                    >
                      {cols} col
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colunas Mobile */}
            {"mobileColumns" in config && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Colunas no Mobile</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[1, 2, 4].map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => onUpdateConfig({ mobileColumns: cols })}
                      className={cn(
                        "h-11 min-h-11 rounded-xl border text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        config.mobileColumns === cols
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 hover:bg-muted text-muted-foreground",
                      )}
                    >
                      {cols} col
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Raio das Bordas */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Arredondamento dos Cantos</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["none", "sm", "md", "xl"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onUpdateStyling({ borderRadius: r })}
                    className={cn(
                      "h-11 min-h-11 rounded-xl border text-xs font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      (styling.borderRadius || "xl") === r
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-muted text-muted-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Borda Divisória */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <Label className="text-xs font-bold text-foreground">Borda Divisória na Seção</Label>
              <button
                type="button"
                onClick={() => onUpdateStyling({ border: !styling.border })}
                className={cn(
                  "h-11 min-h-11 px-4 rounded-xl border text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  styling.border
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-muted",
                )}
              >
                {styling.border ? "Ativada" : "Desativada"}
              </button>
            </div>

            {/* Âncora de Navegação */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <Label className="text-xs font-bold text-foreground">ID de Âncora (Scroll Direct)</Label>
              <Input
                value={selectedBlock.sectionAnchorId || ""}
                onChange={(e) => {
                  const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                  if (onUpdateSectionAnchorId) {
                    onUpdateSectionAnchorId(clean);
                  } else {
                    onUpdateConfig({ sectionAnchorId: clean });
                  }
                }}
                placeholder="Ex: secao-ofertas"
                className="h-11 min-h-11 text-xs rounded-xl font-mono"
              />
            </div>
          </div>
        )}

        {/* ── ABA 3: APARÊNCIA & SUPERFÍCIE ── */}
        {activeTab === "design" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Superfície Semântica da Seção</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "default", label: "Padrão (Tema)" },
                    { id: "card", label: "Card Elevado" },
                    { id: "muted", label: "Cinza Suave" },
                    { id: "accent", label: "Destaque Suave" },
                  ] as const
                ).map((preset) => {
                  const currentSurface = styling.surfacePreset || "default";
                  const isActive = currentSurface === preset.id && !styling.backgroundColor;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        onUpdateStyling({
                          surfacePreset: preset.id,
                          backgroundColor: undefined,
                        })
                      }
                      className={cn(
                        "h-11 min-h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isActive
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border/60 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <span>{preset.label}</span>
                      {isActive && <Check className="size-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cores Customizadas Controladas (Hex Opcional com Reset) */}
            <div className="space-y-3 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Cores Customizadas da Seção</Label>
                {(styling.backgroundColor || styling.textColor) && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateStyling({ backgroundColor: undefined, textColor: undefined })
                    }
                    className="h-11 min-h-11 px-3 rounded-lg text-2xs font-bold text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Restaurar Tema
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground font-semibold">Fundo</span>
                  <Input
                    type="text"
                    value={
                      styling.backgroundColor && !styling.backgroundColor.startsWith("bg-")
                        ? styling.backgroundColor
                        : ""
                    }
                    onChange={(e) =>
                      onUpdateStyling({ backgroundColor: e.target.value.trim() || undefined })
                    }
                    placeholder="Padrão do tema"
                    className="h-11 min-h-11 text-xs rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-2xs text-muted-foreground font-semibold">Texto</span>
                  <Input
                    type="text"
                    value={
                      styling.textColor && !styling.textColor.startsWith("text-")
                        ? styling.textColor
                        : ""
                    }
                    onChange={(e) =>
                      onUpdateStyling({ textColor: e.target.value.trim() || undefined })
                    }
                    placeholder="Padrão do tema"
                    className="h-11 min-h-11 text-xs rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Sombra de Overlay */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <Label className="text-xs font-bold text-foreground">Elevação & Sombra</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "none", label: "Sem Sombra (Plano)" },
                  { id: "md", label: "Sombra Suave (HIG)" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onUpdateStyling({ shadow: s.id as any })}
                    className={cn(
                      "h-11 min-h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      (styling.shadow || "none") === s.id
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border/60 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span>{s.label}</span>
                    {(styling.shadow || "none") === s.id && <Check className="size-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ABA 4: DADOS & DATA BINDING ── */}
        {activeTab === "data" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Database className="size-3.5 text-primary" />
                <span>Origem dos Dados (Data Binding)</span>
              </span>
              <p className="text-2xs text-muted-foreground">
                Vincule este bloco a coleções reais com filtros, ordenação e escopo de tenant.
              </p>
            </div>

            {/* Chaveador Manual vs Dinâmico */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Modo de Alimentação</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "manual", label: "Itens Manuais" },
                  { id: "dynamic", label: "Banco de Dados" },
                ].map((m) => {
                  const isModeActive =
                    m.id === "dynamic" ? isDynamicFeeding : !isDynamicFeeding;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        if (m.id === "manual") {
                          onUpdateConfig({ dataSource: "manual" });
                          onUpdateBinding({ ...binding, entity: undefined });
                        } else {
                          const ds = getDynamicDataSourceForBlock(selectedBlock.type);
                          onUpdateConfig({ dataSource: ds });
                          onUpdateBinding({
                            ...binding,
                            entity: binding.entity || "products",
                            limit: binding.limit || 12,
                            sort: binding.sort || "recent",
                          });
                        }
                      }}
                      className={cn(
                        "h-11 min-h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isModeActive
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border/60 text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <span>{m.label}</span>
                      {isModeActive && <Check className="size-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configurações de Entidade se for Dinâmico */}
            {isDynamicFeeding && (
              <div className="space-y-3 pt-2 border-t border-border/40 animate-in fade-in">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Entidade Vinculada</Label>
                  <select
                    aria-label="Entidade Vinculada"
                    value={binding.entity || "products"}
                    onChange={(e) => {
                      const nextEntity = e.target.value as any;
                      onUpdateBinding({ ...binding, entity: nextEntity });
                      if (selectedBlock.type === "vitrine_ecosystem_rail") {
                        if (
                          nextEntity === "events" ||
                          nextEntity === "jobs" ||
                          nextEntity === "stores" ||
                          nextEntity === "hotpages"
                        ) {
                          onUpdateConfig({ moduleType: nextEntity, dataSource: "live_ecosystem" });
                        }
                      }
                    }}
                    className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-xs text-foreground font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="products">Produtos & Catálogo</option>
                    <option value="stores">Lojas & Empresas Verificadas</option>
                    <option value="classifieds">Classificados & Turismo</option>
                    <option value="news">Notícias & Artigos</option>
                    <option value="events">Agenda de Eventos</option>
                    <option value="jobs">Vagas de Emprego</option>
                    <option value="banners">Banners de Campanha</option>
                    <option value="posts">Publicações Sociais</option>
                    <option value="hotpages">Hotpages & Categorias</option>
                    <option value="flyers">Stories & Encartes</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Limite de Itens</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={binding.limit || 12}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 12));
                        onUpdateBinding({ ...binding, limit: val });
                        if ("maxItems" in config) onUpdateConfig({ maxItems: val });
                      }}
                      className="h-11 min-h-11 text-xs rounded-xl font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Ordenação</Label>
                    <select
                      aria-label="Critério de Ordenação"
                      value={binding.sort || "recent"}
                      onChange={(e) => onUpdateBinding({ ...binding, sort: e.target.value as any })}
                      className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-xs text-foreground font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <option value="recent">Mais Recentes</option>
                      <option value="popular">Mais Populares</option>
                      <option value="highlight">Destaques</option>
                      <option value="price_asc">Menor Preço</option>
                      <option value="price_desc">Maior Preço</option>
                      <option value="alpha">Alfabética (A-Z)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground">Filtro de Categoria / Tag</Label>
                  <Input
                    value={binding.categoryFilter || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateBinding({ ...binding, categoryFilter: val || undefined });
                      if ("categoryFilter" in config) onUpdateConfig({ categoryFilter: val });
                    }}
                    placeholder="Ex: bebidas, pizza, destaque (vazio = todas)"
                    className="h-11 min-h-11 text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Filtro de Cidade</Label>
                    <Input
                      value={binding.cityFilter || ""}
                      onChange={(e) =>
                        onUpdateBinding({ ...binding, cityFilter: e.target.value || undefined })
                      }
                      placeholder="Todas as cidades"
                      className="h-11 min-h-11 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Escopo de Tenant</Label>
                    <select
                      aria-label="Escopo de Tenant"
                      value={binding.tenantScope || "current_store"}
                      onChange={(e) =>
                        onUpdateBinding({ ...binding, tenantScope: e.target.value as any })
                      }
                      className="w-full h-11 min-h-11 px-3 rounded-xl border border-border bg-background text-xs text-foreground font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <option value="current_store">Loja Atual</option>
                      <option value="platform_wide">Rede / Plataforma</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label className="text-xs font-bold text-foreground">Apenas Verificados</Label>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBinding({ ...binding, onlyVerified: !binding.onlyVerified })
                    }
                    className={cn(
                      "h-11 min-h-11 px-4 rounded-xl border text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      binding.onlyVerified
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {binding.onlyVerified ? "Sim (Verificados)" : "Todos"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ABA 5: COMPORTAMENTO, ANIMAÇÃO & AGENDAMENTO (B.29) ── */}
        {activeTab === "interactions" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Animação de Entrada</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "none", label: "Nenhuma" },
                  { id: "fade", label: "Fade In Suave" },
                  { id: "slide-up", label: "Slide Up" },
                  { id: "zoom-in", label: "Zoom In" },
                ].map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onUpdateStyling({ scrollAnimation: a.id as any })}
                    className={cn(
                      "h-11 min-h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      (styling.scrollAnimation || "none") === a.id
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border/60 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span>{a.label}</span>
                    {(styling.scrollAnimation || "none") === a.id && <Check className="size-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Atraso da Animação (ms)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[0, 100, 200, 300].map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => onUpdateStyling({ animationDelayMs: ms })}
                    className={cn(
                      "h-11 min-h-11 rounded-xl border text-xs font-bold font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      (styling.animationDelayMs || 0) === ms
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {ms}ms
                  </button>
                ))}
              </div>
            </div>

            {/* Programação Temporal de Campanha (Invariante B.29) */}
            <div className="space-y-3 pt-3 border-t border-border/40">
              <Label className="text-xs font-bold text-foreground block">
                Agendamento Temporal da Seção
              </Label>
              <div className="space-y-2">
                <span className="text-2xs text-muted-foreground font-semibold block">
                  Exibir a partir de (Início)
                </span>
                <Input
                  type="datetime-local"
                  value={typeof config.startsAt === "string" ? config.startsAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    onUpdateConfig({
                      startsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                    })
                  }
                  className="h-11 min-h-11 text-xs rounded-xl font-mono"
                />
              </div>
              <div className="space-y-2">
                <span className="text-2xs text-muted-foreground font-semibold block">
                  Ocultar / Auto-arquivar em (Fim)
                </span>
                <Input
                  type="datetime-local"
                  value={typeof config.endsAt === "string" ? config.endsAt.slice(0, 16) : ""}
                  onChange={(e) => {
                    const iso = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                    onUpdateConfig({ endsAt: iso, autoArchiveAt: iso });
                  }}
                  className="h-11 min-h-11 text-xs rounded-xl font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── ABA 6: AVANÇADO, VISIBILIDADE & SUBESTADOS ── */}
        {activeTab === "responsive" && (
          <div className="space-y-4">
            {/* Visibilidade Geral do Bloco */}
            {onToggleHidden && (
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Status na Página</Label>
                  <p className="text-2xs text-muted-foreground">
                    Oculte temporariamente sem excluir a seção.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleHidden(!selectedBlock.isHidden)}
                  className={cn(
                    "h-11 min-h-11 px-4 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    selectedBlock.isHidden
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-primary bg-primary/10 text-primary",
                  )}
                >
                  {selectedBlock.isHidden ? (
                    <>
                      <EyeOff className="size-3.5" />
                      <span>Oculto</span>
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5" />
                      <span>Visível</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Visibilidade por Dispositivo */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Visibilidade por Dispositivo</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: "all", label: "Todos" },
                  { id: "desktop_only", label: "Apenas PC" },
                  { id: "mobile_only", label: "Apenas Mobile" },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onUpdateStyling({ deviceVisibility: v.id as any })}
                    className={cn(
                      "h-11 min-h-11 rounded-xl border text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      (styling.deviceVisibility || "all") === v.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-muted text-muted-foreground",
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subestados (ex: Menu/Drawer Aberto ou Fechado) */}
            {capabilities.substates && capabilities.substates.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Subestado Visual do Componente</span>
                  <Sparkles className="size-3.5 text-primary" />
                </Label>
                <p className="text-2xs text-muted-foreground">
                  Alterne entre os subestados internos do componente para inspecionar elementos ocultos.
                </p>
                <div className="space-y-2">
                  {capabilities.substates.map((sub) => {
                    const isSubActive = selectedBlock.activeSubstate === sub;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => onUpdateSubstate?.(sub)}
                        className={cn(
                          "w-full h-11 min-h-11 px-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isSubActive
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/60 hover:bg-muted text-muted-foreground",
                        )}
                      >
                        <span className="capitalize">{sub.replace(/_/g, " ")}</span>
                        {isSubActive && <Check className="size-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
