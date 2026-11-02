import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  Layers,
  Monitor,
  Plus,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BidirectionalMediaUploader } from "@/components/ui/bidirectional-media-uploader";
import { MediaUploader } from "@/components/ui/media-uploader";
import { DestinationPicker } from "@/components/ui/destination-picker";
import { VITRINE_BUTTON_ICON_OPTIONS } from "@/design-system/vitrine";
import type { OmniBlockInstance, OmniBlockStyling } from "./types";

export const VITRINE_APP_BLOCK_TYPES = new Set<string>([
  "vitrine_metamorphic_banner",
  "vitrine_bento_tetris",
  "vitrine_coupon_strip",
  "vitrine_buttons_dock",
  "vitrine_vertical_carousel",
  "vitrine_product_shelf",
  "vitrine_classifieds_rail",
  "vitrine_social_stream",
  "vitrine_ecosystem_rail",
  "vitrine_lateral_drawer",
]);

export function isVitrineAppBlock(type: string): boolean {
  return VITRINE_APP_BLOCK_TYPES.has(type);
}

function bannerAspectToNumber(aspect?: string, fallback = 16 / 9): number {
  switch (aspect) {
    case "ultrawide":
      return 32 / 9;
    case "slim":
      return 28 / 9;
    case "ifood":
      return 21 / 9;
    case "cinema":
    case "duo":
      return 16 / 9;
    case "classic":
      return 4 / 3;
    case "square":
    case "curated_2x2":
      return 1;
    case "vertical":
    case "vertical_4_5":
      return 4 / 5;
    case "flyer_3_4":
      return 3 / 4;
    case "moment":
    case "stories_9_16":
    case "stories_ring":
      return 9 / 16;
    default:
      return fallback;
  }
}

function makeItemId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const SELECT_CLASS =
  "w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const INPUT_CLASS =
  "h-11 min-h-11 rounded-lg text-xs";

interface ArrayItemCardProps {
  title: string;
  subtitle?: string;
  index: number;
  total: number;
  defaultOpen?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}

const ArrayItemCard: React.FC<ArrayItemCardProps> = ({
  title,
  subtitle,
  index,
  total,
  defaultOpen = false,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-1 px-3 py-2 bg-muted/30 border-b border-border/50">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="h-11 min-h-11 flex-1 flex flex-col justify-center text-left min-w-0 pr-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <span className="text-xs font-bold text-foreground truncate">
            {index + 1}. {title || `Item ${index + 1}`}
          </span>
          {subtitle ? (
            <span className="text-2xs text-muted-foreground truncate">{subtitle}</span>
          ) : null}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            title="Subir item"
            className="size-11 min-h-11 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            disabled={index >= total - 1}
            onClick={onMoveDown}
            title="Descer item"
            className="size-11 min-h-11 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicar item"
            className="size-11 min-h-11 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remover item"
            className="size-11 min-h-11 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {open ? <div className="p-3 space-y-3">{children}</div> : null}
    </div>
  );
};

function moveArrayElement<T>(items: T[], index: number, direction: "up" | "down"): T[] {
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items];
  const [picked] = copy.splice(index, 1);
  copy.splice(target, 0, picked);
  return copy;
}

export interface VitrineBlockInspectorProps {
  selectedBlock: OmniBlockInstance;
  onUpdateConfig: (key: string, value: any) => void;
  products?: any[];
  categories?: any[];
  classifieds?: any[];
  posts?: any[];
  flyers?: any[];
  events?: any[];
  jobs?: any[];
  stores?: any[];
  banners?: any[];
  hotpages?: any[];
}

export const VitrineBlockInspector: React.FC<VitrineBlockInspectorProps> = ({
  selectedBlock,
  onUpdateConfig,
  products = [],
  categories = [],
  classifieds = [],
  posts = [],
  flyers = [],
  events = [],
  jobs = [],
  stores = [],
  banners = [],
  hotpages = [],
}) => {
  const type = selectedBlock.type;
  const config = (selectedBlock.config || {}) as Record<string, any>;

  const hasSectionHeader = type !== "vitrine_coupon_strip";
  const hasViewAll =
    type === "vitrine_product_shelf" ||
    type === "vitrine_classifieds_rail" ||
    type === "vitrine_social_stream" ||
    type === "vitrine_ecosystem_rail";

  const availableCategories = Array.from(
    new Set(
      [
        ...categories.map((c: any) => String(c?.name || c?.title || "").trim()),
        ...products.map((p: any) => String(p?.category || "").trim()),
      ].filter(Boolean),
    ),
  );

  return (
    <div className="space-y-4">
      {/* 1. CABEÇALHO DA SEÇÃO */}
      {hasSectionHeader ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">Cabeçalho da Seção</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Título (opcional)
            </label>
            <Input
              value={config.sectionTitle || ""}
              onChange={(e) => onUpdateConfig("sectionTitle", e.target.value)}
              placeholder="Deixe vazio para ocultar o cabeçalho"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Subtítulo (opcional)
            </label>
            <Input
              value={config.sectionSubtitle || ""}
              onChange={(e) => onUpdateConfig("sectionSubtitle", e.target.value)}
              placeholder="Complemento curto"
              className={INPUT_CLASS}
            />
          </div>

          {hasViewAll ? (
            <div className="pt-2 border-t border-border/50 space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Atalho Ver Tudo (opcional)
              </label>
              <Input
                value={config.viewAllLabel || ""}
                onChange={(e) => onUpdateConfig("viewAllLabel", e.target.value)}
                placeholder="Ex: Ver tudo"
                className={INPUT_CLASS}
              />
              {config.viewAllLabel ? (
                <DestinationPicker
                  label="Destino do Ver Tudo"
                  value={config.viewAllHref || ""}
                  onChange={(url) => onUpdateConfig("viewAllHref", url)}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 2. CALIBRAÇÃO BIDIRECIONAL MOBILE VS DESKTOP */}
      {type === "vitrine_metamorphic_banner" ? (
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Proporção Bidirecional (Mobile vs Desktop)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
                <Smartphone className="size-3.5 text-primary" />
                <span>Formato Mobile (&lt; 600px)</span>
              </label>
              <select
                value={config.mobileAspectRatio || "cinema"}
                onChange={(e) => onUpdateConfig("mobileAspectRatio", e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="cinema">Cinema 16:9 (Padrão App)</option>
                <option value="ifood">Panorâmico 21:9 (Hero)</option>
                <option value="classic">Clássico 4:3</option>
                <option value="square">Quadrado 1:1</option>
                <option value="vertical">Retrato 4:5 (Feed)</option>
                <option value="moment">Stories 9:16 (Vertical)</option>
                <option value="slim">Slim Strip 28:9</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
                <Monitor className="size-3.5 text-primary" />
                <span>Formato Desktop (≥ 840px)</span>
              </label>
              <select
                value={config.desktopAspectRatio || "slim"}
                onChange={(e) => onUpdateConfig("desktopAspectRatio", e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="slim">Slim Widescreen 28:9 (Noor)</option>
                <option value="ultrawide">Ultrawide 32:9 (Super Vitrine)</option>
                <option value="ifood">Panorâmico 21:9 (Hero)</option>
                <option value="duo">Duo Split (2 Banners 16:9 Lado a Lado)</option>
                <option value="cinema">Cinema 16:9</option>
                <option value="classic">Clássico 4:3</option>
                <option value="square">Quadrado 1:1</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Cantos</label>
              <select
                value={config.rounded || "lg"}
                onChange={(e) => onUpdateConfig("rounded", e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="lg">Squircle (Padrão)</option>
                <option value="md">Suave</option>
                <option value="none">Sangria Total (0px)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Intervalo (s)
              </label>
              <Input
                type="number"
                min={3}
                max={20}
                value={config.intervalSeconds ?? 5}
                onChange={(e) =>
                  onUpdateConfig("intervalSeconds", Math.max(3, Math.min(20, Number(e.target.value) || 5)))
                }
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label className="h-11 min-h-11 px-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs font-medium text-foreground cursor-pointer">
              <span>Rotação automática</span>
              <input
                type="checkbox"
                checked={config.autoPlay !== false}
                onChange={(e) => onUpdateConfig("autoPlay", e.target.checked)}
                className="size-4 accent-primary"
              />
            </label>
            <label className="h-11 min-h-11 px-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs font-medium text-foreground cursor-pointer">
              <span>Setas e indicadores</span>
              <input
                type="checkbox"
                checked={config.showDots !== false}
                onChange={(e) => {
                  onUpdateConfig("showDots", e.target.checked);
                  onUpdateConfig("showArrows", e.target.checked);
                }}
                className="size-4 accent-primary"
              />
            </label>
          </div>
        </div>
      ) : null}

      {type === "vitrine_bento_tetris" ? (
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Malha Bento / Tetris Bidirecional
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Colunas Mobile
              </label>
              <select
                value={String(config.mobileColumns || 2)}
                onChange={(e) => onUpdateConfig("mobileColumns", Number(e.target.value))}
                className={SELECT_CLASS}
              >
                <option value="1">1 Coluna</option>
                <option value="2">2 Colunas (Bento)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Colunas Desktop
              </label>
              <select
                value={String(config.desktopColumns || 4)}
                onChange={(e) => onUpdateConfig("desktopColumns", Number(e.target.value))}
                className={SELECT_CLASS}
              >
                <option value="2">2 Colunas</option>
                <option value="3">3 Colunas</option>
                <option value="4">4 Colunas (Tetris)</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {type === "vitrine_lateral_drawer" ? (
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Configurações do Menu Lateral Deslizante
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Título de Saudação
            </label>
            <Input
              value={config.greetingTitle || ""}
              onChange={(e) => onUpdateConfig("greetingTitle", e.target.value)}
              placeholder="Ex: Aproveite o Waesy!"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Subtítulo
            </label>
            <Input
              value={config.greetingSubtitle || ""}
              onChange={(e) => onUpdateConfig("greetingSubtitle", e.target.value)}
              placeholder="Ex: Explore categorias e atalhos rápidos"
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Visualização Padrão
              </label>
              <select
                value={config.defaultViewMode || "grid"}
                onChange={(e) => onUpdateConfig("defaultViewMode", e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="grid">Grade de Cards</option>
                <option value="list">Lista Compacta</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="showViewModeToggle"
                checked={config.showViewModeToggle !== false}
                onChange={(e) => onUpdateConfig("showViewModeToggle", e.target.checked)}
                className="size-4 rounded-sm border-border"
              />
              <label htmlFor="showViewModeToggle" className="text-xs font-semibold text-foreground cursor-pointer">
                Alternador Grade/Lista
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {type === "vitrine_buttons_dock" ? (
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Layout de Botões (Mobile vs Desktop)
            </span>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
              <Smartphone className="size-3.5 text-primary" />
              <span>Layout Mobile</span>
            </label>
            <select
              value={config.mobileLayout || "ifood_grid"}
              onChange={(e) => onUpdateConfig("mobileLayout", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="ifood_grid">Grade Compacta 4x2</option>
              <option value="noor_dock">Carrossel Deslizante (Dock)</option>
              <option value="squircle_pills">Chips Horizontais (Pílulas)</option>
              <option value="dual_filter_pills">Pílulas Duplas de Destaque</option>
              <option value="action_cards">Cards de Ação Tátil 2x2</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
              <Monitor className="size-3.5 text-primary" />
              <span>Layout Desktop</span>
            </label>
            <select
              value={config.desktopLayout || "noor_dock"}
              onChange={(e) => onUpdateConfig("desktopLayout", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="noor_dock">Dock Contínuo (Estilo Noor)</option>
              <option value="ifood_grid">Grade Uniforme de Categorias</option>
              <option value="squircle_pills">Barra de Chips / Pílulas</option>
              <option value="dual_filter_pills">Pílulas Duplas de Destaque</option>
              <option value="action_cards">Cards de Ação com Subtítulo</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Cols Mobile
              </label>
              <select
                value={String(config.mobileColumns || 4)}
                onChange={(e) => onUpdateConfig("mobileColumns", Number(e.target.value))}
                className={SELECT_CLASS}
              >
                <option value="2">2 Colunas</option>
                <option value="3">3 Colunas</option>
                <option value="4">4 Colunas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Cols Desktop
              </label>
              <select
                value={String(config.desktopColumns || 8)}
                onChange={(e) => onUpdateConfig("desktopColumns", Number(e.target.value))}
                className={SELECT_CLASS}
              >
                <option value="4">4 Colunas</option>
                <option value="6">6 Colunas</option>
                <option value="8">8 Colunas</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Formato Padrão do Botão
            </label>
            <select
              value={config.defaultShape || "squircle"}
              onChange={(e) => onUpdateConfig("defaultShape", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="squircle">Squircle Apple</option>
              <option value="circle">Circular (Stories)</option>
              <option value="pill">Pílula Horizontal</option>
            </select>
          </div>
        </div>
      ) : null}

      {type === "vitrine_vertical_carousel" ? (
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Formato Vertical (Mobile vs Desktop)
            </span>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
              <Smartphone className="size-3.5 text-primary" />
              <span>Formato Mobile</span>
            </label>
            <select
              value={config.mobileFormat || "stories_9_16"}
              onChange={(e) => onUpdateConfig("mobileFormat", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="stories_9_16">Stories / Reels 9:16</option>
              <option value="vertical_4_5">Editorial Vertical 4:5</option>
              <option value="flyer_3_4">Encarte / Tabloide 3:4</option>
              <option value="stories_ring">Anéis Circulares de Stories</option>
              <option value="curated_2x2">Grade Curada 2x2</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
              <Monitor className="size-3.5 text-primary" />
              <span>Formato Desktop</span>
            </label>
            <select
              value={config.desktopFormat || "stories_9_16"}
              onChange={(e) => onUpdateConfig("desktopFormat", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="stories_9_16">Stories / Reels 9:16</option>
              <option value="vertical_4_5">Editorial Vertical 4:5</option>
              <option value="flyer_3_4">Encarte / Tabloide 3:4</option>
              <option value="stories_ring">Anéis Circulares de Stories</option>
              <option value="curated_2x2">Mosaico Curado 4 Colunas</option>
            </select>
          </div>
        </div>
      ) : null}

      {type === "vitrine_product_shelf" ? (
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Exibição da Vitrine (Mobile vs Desktop)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
                <Smartphone className="size-3.5 text-primary" />
                <span>Layout Mobile</span>
              </label>
              <select
                value={config.mobileLayout || "horizontal_rail"}
                onChange={(e) => onUpdateConfig("mobileLayout", e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="horizontal_rail">Carrossel Deslizante</option>
                <option value="grid_2col">Grade 2 Colunas</option>
                <option value="list_compact">Lista Compacta (Estilo Cardápio)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
                <Monitor className="size-3.5 text-primary" />
                <span>Layout Desktop</span>
              </label>
              <select
                value={config.desktopLayout || "horizontal_rail"}
                onChange={(e) => onUpdateConfig("desktopLayout", e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="horizontal_rail">Trilho Horizontal (Hits)</option>
                <option value="grid_4col">Grade 4 Colunas</option>
                <option value="bento_3">Grade 3 Colunas Amplas</option>
                <option value="split_2col">Lista Dupla (2 Colunas)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Foto do Card
              </label>
              <select
                value={config.cardAspect || "4_3"}
                onChange={(e) => onUpdateConfig("cardAspect", e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="4_3">Padrão 4:3</option>
                <option value="square">Quadrado 1:1</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Texto do Botão
              </label>
              <Input
                value={config.ctaLabel || "Ver Oferta"}
                onChange={(e) => onUpdateConfig("ctaLabel", e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>
      ) : null}

      {type === "vitrine_classifieds_rail" ? (
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Exibição de Anúncios (Mobile vs Desktop)
            </span>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
              <Smartphone className="size-3.5 text-primary" />
              <span>Layout Mobile</span>
            </label>
            <select
              value={config.mobileLayout || "horizontal_rail"}
              onChange={(e) => onUpdateConfig("mobileLayout", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="horizontal_rail">Carrossel Horizontal</option>
              <option value="grid_2col">Grade 2 Colunas</option>
              <option value="grid_1col">Lista Vertical Ampla</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
              <Monitor className="size-3.5 text-primary" />
              <span>Layout Desktop</span>
            </label>
            <select
              value={config.desktopLayout || "horizontal_rail"}
              onChange={(e) => onUpdateConfig("desktopLayout", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="horizontal_rail">Carrossel Horizontal</option>
              <option value="grid_3col">Grade 3 Colunas</option>
              <option value="grid_4col">Grade 4 Colunas</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Texto do Botão CTA
            </label>
            <Input
              value={config.ctaLabel || "Ver Anúncio"}
              onChange={(e) => onUpdateConfig("ctaLabel", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>
      ) : null}

      {type === "vitrine_social_stream" ? (
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Formato dos Posts (Mobile vs Desktop)
            </span>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
              <Smartphone className="size-3.5 text-primary" />
              <span>Formato Mobile</span>
            </label>
            <select
              value={config.mobileLayout || "carousel"}
              onChange={(e) => onUpdateConfig("mobileLayout", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="carousel">Carrossel Deslizante de Posts</option>
              <option value="stream">Feed Contínuo (Linha do Tempo)</option>
              <option value="grid_2col">Grade Social 2 Colunas</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-foreground mb-1">
              <Monitor className="size-3.5 text-primary" />
              <span>Formato Desktop</span>
            </label>
            <select
              value={config.desktopLayout || "carousel_3col"}
              onChange={(e) => onUpdateConfig("desktopLayout", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="carousel_3col">Carrossel Editorial</option>
              <option value="grid_3col">Grade 3 Colunas</option>
              <option value="stream_2col">Mural Duplo (2 Colunas)</option>
            </select>
          </div>
        </div>
      ) : null}

      {type === "vitrine_ecosystem_rail" ? (
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Módulo Conectado & Layout
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Estrutura do Ecossistema
            </label>
            <select
              value={config.moduleType || "events"}
              onChange={(e) => onUpdateConfig("moduleType", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="events">Agenda & Eventos ({events.length})</option>
              <option value="jobs">Vagas de Emprego ({jobs.length})</option>
              <option value="stores">Lojas & Parceiros ({stores.length})</option>
              <option value="hotpages">Páginas Especiais / Hotpages ({hotpages.length})</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Mobile
              </label>
              <select
                value={config.mobileLayout || "horizontal_rail"}
                onChange={(e) => onUpdateConfig("mobileLayout", e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="horizontal_rail">Carrossel</option>
                <option value="stack">Lista Vertical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Desktop
              </label>
              <select
                value={config.desktopLayout || "horizontal_rail"}
                onChange={(e) => onUpdateConfig("desktopLayout", e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="horizontal_rail">Carrossel</option>
                <option value="grid_3col">Grade 3 Cols</option>
                <option value="grid_4col">Grade 4 Cols</option>
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. CONEXÃO COM DADOS VIVOS VS CURADORIA MANUAL */}
      {type === "vitrine_metamorphic_banner" ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Database className="size-3.5 text-primary" />
              Fonte dos Slides
            </span>
            <span className="text-2xs font-mono text-muted-foreground">
              {banners.length} banner(s) na loja
            </span>
          </div>
          <select
            value={config.dataSource || "manual"}
            onChange={(e) => onUpdateConfig("dataSource", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="manual">Slides Personalizados neste Bloco</option>
            <option value="store_banners">Banners Ativos da Loja (Automático)</option>
          </select>
        </div>
      ) : null}

      {type === "vitrine_buttons_dock" ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Database className="size-3.5 text-primary" />
              Fonte dos Botões
            </span>
            <span className="text-2xs font-mono text-muted-foreground">
              {categories.length} categoria(s)
            </span>
          </div>
          <select
            value={config.dataSource || "manual"}
            onChange={(e) => onUpdateConfig("dataSource", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="manual">Botões 100% Editáveis Manualmente</option>
            <option value="store_categories">Categorias Reais da Loja</option>
            <option value="hybrid">Híbrido (Meus Botões + Categorias da Loja)</option>
          </select>
        </div>
      ) : null}

      {type === "vitrine_vertical_carousel" ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Database className="size-3.5 text-primary" />
              Fonte dos Cards Verticais
            </span>
            <span className="text-2xs font-mono text-muted-foreground">
              {flyers.length} encarte(s)
            </span>
          </div>
          <select
            value={config.dataSource || "manual"}
            onChange={(e) => onUpdateConfig("dataSource", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="manual">Cards / Reels Personalizados</option>
            <option value="store_flyers">Encartes & Ofertas da Loja (Automático)</option>
          </select>
        </div>
      ) : null}

      {type === "vitrine_product_shelf" ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Database className="size-3.5 text-primary" />
              Conexão com Catálogo
            </span>
            <span className="text-2xs font-mono text-muted-foreground">
              {products.length} produto(s)
            </span>
          </div>

          <select
            value={config.dataSource || "store_products"}
            onChange={(e) => onUpdateConfig("dataSource", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="store_products">Catálogo Real da Loja (Automático)</option>
            <option value="manual">Curadoria Manual neste Bloco</option>
          </select>

          {config.dataSource !== "manual" ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Filtrar Categoria
                </label>
                <select
                  value={config.categoryFilter || "all"}
                  onChange={(e) => onUpdateConfig("categoryFilter", e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="all">Todas as categorias</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <label className="h-11 min-h-11 px-3 rounded-lg border border-border/60 bg-background flex items-center justify-between text-xs font-medium text-foreground cursor-pointer">
                <span>Apenas itens em promoção</span>
                <input
                  type="checkbox"
                  checked={Boolean(config.onlyPromotions)}
                  onChange={(e) => onUpdateConfig("onlyPromotions", e.target.checked)}
                  className="size-4 accent-primary"
                />
              </label>
            </>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Limite de Itens
            </label>
            <Input
              type="number"
              min={1}
              max={24}
              value={config.maxItems ?? 8}
              onChange={(e) =>
                onUpdateConfig("maxItems", Math.max(1, Math.min(24, Number(e.target.value) || 8)))
              }
              className={INPUT_CLASS}
            />
          </div>
        </div>
      ) : null}

      {type === "vitrine_classifieds_rail" ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Database className="size-3.5 text-primary" />
              Conexão com Classificados
            </span>
            <span className="text-2xs font-mono text-muted-foreground">
              {classifieds.length} anúncio(s)
            </span>
          </div>

          <select
            value={config.dataSource || "store_classifieds"}
            onChange={(e) => onUpdateConfig("dataSource", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="store_classifieds">Anúncios Reais da Conta (Automático)</option>
            <option value="manual">Anúncios Cadastrados neste Bloco</option>
          </select>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Filtro de Nicho Semântico
            </label>
            <select
              value={config.nicheFilter || "all"}
              onChange={(e) => onUpdateConfig("nicheFilter", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="all">Todos os Nichos</option>
              <option value="vehicles">Veículos & Automotivo</option>
              <option value="real_estate">Imóveis & Temporada</option>
              <option value="tourism">Turismo & Pacotes</option>
              <option value="services">Serviços Profissionais</option>
              <option value="general">Classificados Gerais</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Limite de Anúncios
            </label>
            <Input
              type="number"
              min={1}
              max={24}
              value={config.maxItems ?? 8}
              onChange={(e) =>
                onUpdateConfig("maxItems", Math.max(1, Math.min(24, Number(e.target.value) || 8)))
              }
              className={INPUT_CLASS}
            />
          </div>
        </div>
      ) : null}

      {type === "vitrine_social_stream" ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Database className="size-3.5 text-primary" />
              Fonte das Publicações
            </span>
            <span className="text-2xs font-mono text-muted-foreground">
              {posts.length} post(s)
            </span>
          </div>

          <select
            value={config.dataSource || "store_posts"}
            onChange={(e) => onUpdateConfig("dataSource", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="store_posts">Feed Real da Loja / Criador</option>
            <option value="manual">Posts Editoriais neste Bloco</option>
          </select>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Limite de Publicações
            </label>
            <Input
              type="number"
              min={1}
              max={24}
              value={config.maxItems ?? 6}
              onChange={(e) =>
                onUpdateConfig("maxItems", Math.max(1, Math.min(24, Number(e.target.value) || 6)))
              }
              className={INPUT_CLASS}
            />
          </div>
        </div>
      ) : null}

      {type === "vitrine_ecosystem_rail" ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Database className="size-3.5 text-primary" />
              Fonte dos Dados
            </span>
          </div>
          <select
            value={config.dataSource || "live"}
            onChange={(e) => onUpdateConfig("dataSource", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="live">Sincronizado ao Vivo com o Ecossistema</option>
            <option value="manual">Curadoria Manual neste Bloco</option>
          </select>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Limite de Cards
            </label>
            <Input
              type="number"
              min={1}
              max={24}
              value={config.maxItems ?? 6}
              onChange={(e) =>
                onUpdateConfig("maxItems", Math.max(1, Math.min(24, Number(e.target.value) || 6)))
              }
              className={INPUT_CLASS}
            />
          </div>
        </div>
      ) : null}

      {/* 4. CARD EDITORIAL LÍDER OPCIONAL (HITS LEAD CARD EM VITRINE DE PRODUTOS) */}
      {type === "vitrine_product_shelf" ? (
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
          <label className="h-11 min-h-11 px-3 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between text-xs font-bold text-foreground cursor-pointer">
            <span>Card Editorial Líder (Hits)</span>
            <input
              type="checkbox"
              checked={Boolean(config.leadCard?.enabled)}
              onChange={(e) =>
                onUpdateConfig("leadCard", {
                  ...(config.leadCard || {}),
                  enabled: e.target.checked,
                  title: config.leadCard?.title || "Seleção Especial",
                  actionLabel: config.leadCard?.actionLabel || "Explorar",
                })
              }
              className="size-4 accent-primary"
            />
          </label>

          {config.leadCard?.enabled ? (
            <div className="space-y-3 pt-1">
              <Input
                value={config.leadCard?.badge || ""}
                onChange={(e) =>
                  onUpdateConfig("leadCard", { ...config.leadCard, badge: e.target.value })
                }
                placeholder="Selo superior (ex: Hits da Semana)"
                className={INPUT_CLASS}
              />
              <Input
                value={config.leadCard?.title || ""}
                onChange={(e) =>
                  onUpdateConfig("leadCard", { ...config.leadCard, title: e.target.value })
                }
                placeholder="Título do card líder"
                className={INPUT_CLASS}
              />
              <Textarea
                rows={2}
                value={config.leadCard?.subtitle || ""}
                onChange={(e) =>
                  onUpdateConfig("leadCard", { ...config.leadCard, subtitle: e.target.value })
                }
                placeholder="Subtítulo curto"
                className="rounded-lg text-xs resize-none"
              />
              <Input
                value={config.leadCard?.actionLabel || ""}
                onChange={(e) =>
                  onUpdateConfig("leadCard", { ...config.leadCard, actionLabel: e.target.value })
                }
                placeholder="Texto do botão"
                className={INPUT_CLASS}
              />
              <DestinationPicker
                label="Destino do Card Líder"
                value={config.leadCard?.href || ""}
                onChange={(url) =>
                  onUpdateConfig("leadCard", { ...config.leadCard, href: url })
                }
              />
              <BidirectionalMediaUploader
                label="Arte do Card Líder"
                description="Opcional. Se vazio, usa superfície editorial limpa."
                mobileUrl={config.leadCard?.imageMobileUrl || ""}
                desktopUrl={config.leadCard?.imageDesktopUrl || ""}
                mobileAspect={4 / 3}
                desktopAspect={3 / 4}
                onMobileChange={(url) =>
                  onUpdateConfig("leadCard", { ...config.leadCard, imageMobileUrl: url })
                }
                onDesktopChange={(url) =>
                  onUpdateConfig("leadCard", { ...config.leadCard, imageDesktopUrl: url })
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 5. FAIXA DE CUPOM / SLIM CALLOUT */}
      {type === "vitrine_coupon_strip" ? (
        <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Estilo da Faixa
            </label>
            <select
              value={config.variant || "coupon"}
              onChange={(e) => onUpdateConfig("variant", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="coupon">Ticket de Cupom Copiável</option>
              <option value="slim_strip">Faixa Slim Minimalista</option>
              <option value="highlight_bar">Barra de Destaque Alto Contraste</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Selo</label>
            <Input
              value={config.badge || ""}
              onChange={(e) => onUpdateConfig("badge", e.target.value)}
              placeholder="Ex: Cupom Ativo"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Mensagem Principal
            </label>
            <Input
              value={config.title || ""}
              onChange={(e) => onUpdateConfig("title", e.target.value)}
              placeholder="Ex: Frete grátis no primeiro pedido"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Complemento (opcional)
            </label>
            <Input
              value={config.subtitle || ""}
              onChange={(e) => onUpdateConfig("subtitle", e.target.value)}
              placeholder="Regras ou validade"
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Código Cupom
              </label>
              <Input
                value={config.couponCode || ""}
                onChange={(e) => onUpdateConfig("couponCode", e.target.value.toUpperCase())}
                placeholder="BEMVINDO10"
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Botão Link
              </label>
              <Input
                value={config.ctaLabel || ""}
                onChange={(e) => onUpdateConfig("ctaLabel", e.target.value)}
                placeholder="Aproveitar"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {config.ctaLabel ? (
            <DestinationPicker
              label="Destino do Botão"
              value={config.href || ""}
              onChange={(url) => onUpdateConfig("href", url)}
            />
          ) : null}

          <label className="h-11 min-h-11 px-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs font-medium text-foreground cursor-pointer">
            <span>Permitir fechar a faixa</span>
            <input
              type="checkbox"
              checked={Boolean(config.dismissible)}
              onChange={(e) => onUpdateConfig("dismissible", e.target.checked)}
              className="size-4 accent-primary"
            />
          </label>
        </div>
      ) : null}

      {/* 6. EDITOR DE SLIDES DO BANNER METAMÓRFICO */}
      {type === "vitrine_metamorphic_banner" && config.dataSource !== "store_banners" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Slides do Banner ({Array.isArray(config.slides) ? config.slides.length : 0})
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const slides = Array.isArray(config.slides) ? config.slides : [];
                onUpdateConfig("slides", [
                  ...slides,
                  {
                    id: makeItemId("slide"),
                    badge: "Destaque",
                    title: "Novo Slide Promocional",
                    subtitle: "Configure arte mobile e desktop independentes.",
                    ctaLabel: "Saiba Mais",
                    href: "#ofertas",
                    showOverlay: true,
                  },
                ]);
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1"
            >
              <Plus className="size-4" />
              <span>Slide</span>
            </Button>
          </div>

          {(Array.isArray(config.slides) ? config.slides : []).map((slide: any, idx: number, arr: any[]) => {
            const updateSlide = (patch: Record<string, any>) => {
              const next = [...arr];
              next[idx] = { ...slide, ...patch };
              onUpdateConfig("slides", next);
            };
            return (
              <ArrayItemCard
                key={slide.id || idx}
                index={idx}
                total={arr.length}
                defaultOpen={idx === 0}
                title={slide.title || slide.badge || `Slide ${idx + 1}`}
                subtitle={slide.href || undefined}
                onMoveUp={() => onUpdateConfig("slides", moveArrayElement(arr, idx, "up"))}
                onMoveDown={() => onUpdateConfig("slides", moveArrayElement(arr, idx, "down"))}
                onDuplicate={() => {
                  const next = [...arr];
                  next.splice(idx + 1, 0, { ...slide, id: makeItemId("slide") });
                  onUpdateConfig("slides", next);
                }}
                onRemove={() => onUpdateConfig("slides", arr.filter((_, i) => i !== idx))}
              >
                <BidirectionalMediaUploader
                  label="Arte Mobile & Desktop do Slide"
                  description="Artes dedicadas por dispositivo respeitando a proporção escolhida."
                  mobileUrl={slide.imageMobileUrl || slide.imageUrl || ""}
                  desktopUrl={slide.imageDesktopUrl || slide.imageUrl || ""}
                  mobileAspect={bannerAspectToNumber(config.mobileAspectRatio, 16 / 9)}
                  desktopAspect={bannerAspectToNumber(config.desktopAspectRatio, 28 / 9)}
                  onMobileChange={(url) => updateSlide({ imageMobileUrl: url })}
                  onDesktopChange={(url) => updateSlide({ imageDesktopUrl: url })}
                />

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Vídeo MP4 / Loop (opcional)
                  </label>
                  <Input
                    value={slide.videoUrl || ""}
                    onChange={(e) =>
                      updateSlide({
                        videoUrl: e.target.value,
                        mediaType: e.target.value ? "video" : "image",
                      })
                    }
                    placeholder="URL .mp4 opcional"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={slide.badge || ""}
                    onChange={(e) => updateSlide({ badge: e.target.value })}
                    placeholder="Selo (ex: Oferta)"
                    className={INPUT_CLASS}
                  />
                  <Input
                    value={slide.ctaLabel || ""}
                    onChange={(e) => updateSlide({ ctaLabel: e.target.value })}
                    placeholder="Botão (ex: Ver Agora)"
                    className={INPUT_CLASS}
                  />
                </div>

                <Input
                  value={slide.title || ""}
                  onChange={(e) => updateSlide({ title: e.target.value })}
                  placeholder="Título sobre o banner (opcional se a arte já tiver texto)"
                  className={INPUT_CLASS}
                />

                <Textarea
                  rows={2}
                  value={slide.subtitle || ""}
                  onChange={(e) => updateSlide({ subtitle: e.target.value })}
                  placeholder="Subtítulo opcional"
                  className="rounded-lg text-xs resize-none"
                />

                <Input
                  value={slide.imageAlt || ""}
                  onChange={(e) => updateSlide({ imageAlt: e.target.value })}
                  placeholder="Texto alternativo de acessibilidade (alt)"
                  className={INPUT_CLASS}
                />

                <DestinationPicker
                  label="Destino ao Clicar no Slide"
                  value={slide.href || ""}
                  onChange={(url) => updateSlide({ href: url })}
                />

                <label className="h-11 min-h-11 px-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs font-medium text-foreground cursor-pointer">
                  <span>Exibir textos sobre a imagem</span>
                  <input
                    type="checkbox"
                    checked={slide.showOverlay !== false}
                    onChange={(e) => updateSlide({ showOverlay: e.target.checked })}
                    className="size-4 accent-primary"
                  />
                </label>
              </ArrayItemCard>
            );
          })}
        </div>
      ) : null}

      

      {/* 7. EDITOR DE TILES DO BENTO / TETRIS */}
      {type === "vitrine_bento_tetris" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Blocos Bento ({Array.isArray(config.tiles) ? config.tiles.length : 0})
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const tiles = Array.isArray(config.tiles) ? config.tiles : [];
                onUpdateConfig("tiles", [
                  ...tiles,
                  {
                    id: makeItemId("bento"),
                    tag: "Destaque",
                    title: "Novo Bloco Bento",
                    subtitle: "Subtítulo direto",
                    ctaLabel: "Explorar",
                    href: "#ofertas",
                    spanX: 1,
                    spanY: 1,
                    mobileSpanX: 1,
                  },
                ]);
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1"
            >
              <Plus className="size-4" />
              <span>Bloco</span>
            </Button>
          </div>

          {(Array.isArray(config.tiles) ? config.tiles : []).map((tile: any, idx: number, arr: any[]) => {
            const updateTile = (patch: Record<string, any>) => {
              const next = [...arr];
              next[idx] = { ...tile, ...patch };
              onUpdateConfig("tiles", next);
            };
            return (
              <ArrayItemCard
                key={tile.id || idx}
                index={idx}
                total={arr.length}
                defaultOpen={idx === 0}
                title={tile.title}
                subtitle={`Desktop ${tile.spanX || 1}x${tile.spanY || 1} · Mobile ${tile.mobileSpanX || 1} col`}
                onMoveUp={() => onUpdateConfig("tiles", moveArrayElement(arr, idx, "up"))}
                onMoveDown={() => onUpdateConfig("tiles", moveArrayElement(arr, idx, "down"))}
                onDuplicate={() => {
                  const next = [...arr];
                  next.splice(idx + 1, 0, { ...tile, id: makeItemId("bento") });
                  onUpdateConfig("tiles", next);
                }}
                onRemove={() => onUpdateConfig("tiles", arr.filter((_, i) => i !== idx))}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-2xs font-semibold text-muted-foreground mb-1">
                      Largura Desktop
                    </label>
                    <select
                      value={String(tile.spanX || 1)}
                      onChange={(e) => updateTile({ spanX: Number(e.target.value) })}
                      className={SELECT_CLASS}
                    >
                      <option value="1">1 Coluna</option>
                      <option value="2">2 Colunas (Largo)</option>
                      <option value="3">3 Colunas</option>
                      <option value="4">4 Colunas (Faixa)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-muted-foreground mb-1">
                      Altura Desktop
                    </label>
                    <select
                      value={String(tile.spanY || 1)}
                      onChange={(e) => updateTile({ spanY: Number(e.target.value) })}
                      className={SELECT_CLASS}
                    >
                      <option value="1">1 Linha (Padrão)</option>
                      <option value="2">2 Linhas (Destaque Alto)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-muted-foreground mb-1">
                    Largura no Mobile
                  </label>
                  <select
                    value={String(tile.mobileSpanX || 1)}
                    onChange={(e) => updateTile({ mobileSpanX: Number(e.target.value) })}
                    className={SELECT_CLASS}
                  >
                    <option value="1">Meia Largura (1 de 2)</option>
                    <option value="2">Largura Total (2 de 2)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={tile.tag || ""}
                    onChange={(e) => updateTile({ tag: e.target.value })}
                    placeholder="Tag (ex: Coleção)"
                    className={INPUT_CLASS}
                  />
                  <Input
                    value={tile.ctaLabel || ""}
                    onChange={(e) => updateTile({ ctaLabel: e.target.value })}
                    placeholder="CTA (ex: Conferir)"
                    className={INPUT_CLASS}
                  />
                </div>

                <Input
                  value={tile.title || ""}
                  onChange={(e) => updateTile({ title: e.target.value })}
                  placeholder="Título do bloco"
                  className={INPUT_CLASS}
                />

                <Input
                  value={tile.subtitle || ""}
                  onChange={(e) => updateTile({ subtitle: e.target.value })}
                  placeholder="Subtítulo opcional"
                  className={INPUT_CLASS}
                />

                <BidirectionalMediaUploader
                  label="Imagem do Tile (Mobile & Desktop)"
                  mobileUrl={tile.imageMobileUrl || tile.imageUrl || ""}
                  desktopUrl={tile.imageDesktopUrl || tile.imageUrl || ""}
                  mobileAspect={(tile.mobileSpanX || 1) === 2 ? 16 / 9 : 1}
                  desktopAspect={(tile.spanX || 1) >= 2 && (tile.spanY || 1) === 1 ? 21 / 9 : 4 / 3}
                  onMobileChange={(url) => updateTile({ imageMobileUrl: url })}
                  onDesktopChange={(url) => updateTile({ imageDesktopUrl: url })}
                />

                <DestinationPicker
                  label="Link do Bloco"
                  value={tile.href || ""}
                  onChange={(url) => updateTile({ href: url })}
                />
              </ArrayItemCard>
            );
          })}
        </div>
      ) : null}

      

      {/* 8. EDITOR DE BOTÕES 100% EDITÁVEIS (CARROSSEL / DOCK / GRADE) */}
      {type === "vitrine_buttons_dock" && config.dataSource !== "store_categories" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Botões Editáveis ({Array.isArray(config.items) ? config.items.length : 0})
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const items = Array.isArray(config.items) ? config.items : [];
                onUpdateConfig("items", [
                  ...items,
                  {
                    id: makeItemId("btn"),
                    label: "Novo Atalho",
                    subtitle: "",
                    badge: "",
                    iconName: "Tag",
                    shape: config.defaultShape || "squircle",
                    tone: "default",
                    showLabel: true,
                    href: "#ofertas",
                  },
                ]);
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1"
            >
              <Plus className="size-4" />
              <span>Botão</span>
            </Button>
          </div>

          {(Array.isArray(config.items) ? config.items : []).map((btn: any, idx: number, arr: any[]) => {
            const updateBtn = (patch: Record<string, any>) => {
              const next = [...arr];
              next[idx] = { ...btn, ...patch };
              onUpdateConfig("items", next);
            };
            return (
              <ArrayItemCard
                key={btn.id || idx}
                index={idx}
                total={arr.length}
                defaultOpen={idx === 0}
                title={btn.label}
                subtitle={btn.href || btn.badge || undefined}
                onMoveUp={() => onUpdateConfig("items", moveArrayElement(arr, idx, "up"))}
                onMoveDown={() => onUpdateConfig("items", moveArrayElement(arr, idx, "down"))}
                onDuplicate={() => {
                  const next = [...arr];
                  next.splice(idx + 1, 0, { ...btn, id: makeItemId("btn") });
                  onUpdateConfig("items", next);
                }}
                onRemove={() => onUpdateConfig("items", arr.filter((_, i) => i !== idx))}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-2xs font-semibold text-muted-foreground mb-1">
                      Rótulo do Botão
                    </label>
                    <Input
                      value={btn.label || ""}
                      onChange={(e) => updateBtn({ label: e.target.value })}
                      placeholder="Ex: Promoções"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-muted-foreground mb-1">
                      Selo (opcional)
                    </label>
                    <Input
                      value={btn.badge || ""}
                      onChange={(e) => updateBtn({ badge: e.target.value })}
                      placeholder="Ex: Novo"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <Input
                  value={btn.subtitle || ""}
                  onChange={(e) => updateBtn({ subtitle: e.target.value })}
                  placeholder="Subtítulo (usado em Pílulas Duplas / Cards de Ação)"
                  className={INPUT_CLASS}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-2xs font-semibold text-muted-foreground mb-1">
                      Ícone Vetorial
                    </label>
                    <select
                      value={btn.iconName || "Tag"}
                      onChange={(e) => updateBtn({ iconName: e.target.value })}
                      className={SELECT_CLASS}
                    >
                      {VITRINE_BUTTON_ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-muted-foreground mb-1">
                      Tom Visual
                    </label>
                    <select
                      value={btn.tone || "default"}
                      onChange={(e) => updateBtn({ tone: e.target.value })}
                      className={SELECT_CLASS}
                    >
                      <option value="default">Superfície Padrão</option>
                      <option value="primary">Destaque Primário</option>
                      <option value="accent">Tonalidade Suave</option>
                      <option value="muted">Neutro Discreto</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-2xs font-semibold text-muted-foreground mb-1">
                      Formato Individual
                    </label>
                    <select
                      value={btn.shape || config.defaultShape || "squircle"}
                      onChange={(e) => updateBtn({ shape: e.target.value })}
                      className={SELECT_CLASS}
                    >
                      <option value="squircle">Squircle</option>
                      <option value="circle">Circular</option>
                      <option value="pill">Pílula</option>
                    </select>
                  </div>
                  <label className="h-11 min-h-11 mt-5 px-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between text-xs font-medium text-foreground cursor-pointer">
                    <span>Mostrar texto</span>
                    <input
                      type="checkbox"
                      checked={btn.showLabel !== false}
                      onChange={(e) => updateBtn({ showLabel: e.target.checked })}
                      className="size-4 accent-primary"
                    />
                  </label>
                </div>

                <BidirectionalMediaUploader
                  label="Arte / Ícone Ilustrado Customizado (Opcional)"
                  description="Se enviada, substitui o ícone vetorial por imagem mobile/desktop dedicada."
                  bucket="banners"
                  folder="botoes"
                  mobileUrl={btn.imageMobileUrl || btn.imageUrl || ""}
                  desktopUrl={btn.imageDesktopUrl || btn.imageUrl || ""}
                  mobileAspect={1}
                  desktopAspect={1}
                  onMobileChange={(url) => updateBtn({ imageMobileUrl: url })}
                  onDesktopChange={(url) => updateBtn({ imageDesktopUrl: url })}
                />

                <DestinationPicker
                  label="Destino do Botão"
                  value={btn.href || ""}
                  onChange={(url) => updateBtn({ href: url })}
                />
              </ArrayItemCard>
            );
          })}
        </div>
      ) : null}

      

            {/* 8.1 EDITOR DE SEÇÕES E BOTÕES DO MENU LATERAL */}
      {type === "vitrine_lateral_drawer" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Seções Temáticas ({Array.isArray(config.sections) ? config.sections.length : 0})
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const sections = Array.isArray(config.sections) ? config.sections : [];
                onUpdateConfig("sections", [
                  ...sections,
                  {
                    id: makeItemId("sec"),
                    title: "Nova Seção",
                    items: [
                      {
                        id: makeItemId("it"),
                        label: "Novo Item",
                        href: "/",
                        cardVariant: "squircle",
                        icon: "Tag",
                        isActive: true,
                      },
                    ],
                  },
                ]);
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1"
            >
              <Plus className="size-4" />
              <span>Seção</span>
            </Button>
          </div>

          {(Array.isArray(config.sections) ? config.sections : []).map(
            (sec: any, secIdx: number, secArr: any[]) => {
              const updateSection = (patch: Record<string, any>) => {
                const next = [...secArr];
                next[secIdx] = { ...sec, ...patch };
                onUpdateConfig("sections", next);
              };

              return (
                <div key={sec.id || secIdx} className="rounded-xl border border-border/70 bg-card p-3 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={sec.title || ""}
                      onChange={(e) => updateSection({ title: e.target.value })}
                      placeholder="Título da Seção (Ex: Categorias, Destaques)"
                      className={`${INPUT_CLASS} font-bold text-xs`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdateConfig("sections", secArr.filter((_, i) => i !== secIdx))}
                      className="size-11 min-h-11 min-w-11 p-0 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {/* Lista de itens da seção */}
                  <div className="space-y-2 pt-1 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-semibold text-muted-foreground">
                        Itens ({Array.isArray(sec.items) ? sec.items.length : 0})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const items = Array.isArray(sec.items) ? sec.items : [];
                          updateSection({
                            items: [
                              ...items,
                              {
                                id: makeItemId("it"),
                                label: "Novo Item",
                                href: "/",
                                cardVariant: "squircle",
                                icon: "Tag",
                                isActive: true,
                              },
                            ],
                          });
                        }}
                        className="h-11 min-h-11 px-2 text-2xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Plus className="size-3" />
                        <span>Adicionar Item</span>
                      </button>
                    </div>

                    {(Array.isArray(sec.items) ? sec.items : []).map(
                      (item: any, itIdx: number, itArr: any[]) => {
                        const updateItem = (patch: Record<string, any>) => {
                          const nextItems = [...itArr];
                          nextItems[itIdx] = { ...item, ...patch };
                          updateSection({ items: nextItems });
                        };

                        return (
                          <div
                            key={item.id || itIdx}
                            className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-3xs font-semibold text-muted-foreground mb-1">
                                  Rótulo
                                </label>
                                <Input
                                  value={item.label || ""}
                                  onChange={(e) => updateItem({ label: e.target.value })}
                                  placeholder="Ex: Restaurantes"
                                  className={INPUT_CLASS}
                                />
                              </div>
                              <div>
                                <label className="block text-3xs font-semibold text-muted-foreground mb-1">
                                  Formato
                                </label>
                                <select
                                  value={item.cardVariant || "squircle"}
                                  onChange={(e) => updateItem({ cardVariant: e.target.value })}
                                  className={SELECT_CLASS}
                                >
                                  <option value="wide">Card Amplo (2 colunas)</option>
                                  <option value="squircle">Squircle (4 colunas)</option>
                                  <option value="full_width">Full Width</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-3xs font-semibold text-muted-foreground mb-1">
                                  Badge (opcional)
                                </label>
                                <Input
                                  value={item.badge || ""}
                                  onChange={(e) => updateItem({ badge: e.target.value })}
                                  placeholder="Ex: Novo"
                                  className={INPUT_CLASS}
                                />
                              </div>
                              <div>
                                <label className="block text-3xs font-semibold text-muted-foreground mb-1">
                                  Ícone
                                </label>
                                <select
                                  value={item.icon || "Tag"}
                                  onChange={(e) => updateItem({ icon: e.target.value })}
                                  className={SELECT_CLASS}
                                >
                                  {VITRINE_BUTTON_ICON_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <DestinationPicker
                              label="Destino / Rota"
                              value={item.href || ""}
                              onChange={(url) => updateItem({ href: url })}
                            />

                            <div className="flex items-center justify-between pt-1">
                              <label className="flex items-center gap-2 text-2xs font-semibold text-foreground cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.isActive !== false}
                                  onChange={(e) => updateItem({ isActive: e.target.checked })}
                                  className="size-3.5 rounded-sm border-border"
                                />
                                <span>Item Ativo</span>
                              </label>

                              <button
                                type="button"
                                onClick={() =>
                                  updateSection({ items: itArr.filter((_, i) => i !== itIdx) })
                                }
                                className="h-11 min-h-11 px-2 text-2xs text-destructive hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      ) : null}

{/* 9. EDITOR DO CARROSSEL VERTICAL (REELS, STORIES, ENCARTES) */}
      {type === "vitrine_vertical_carousel" && config.dataSource !== "store_flyers" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Cards Verticais ({Array.isArray(config.items) ? config.items.length : 0})
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const items = Array.isArray(config.items) ? config.items : [];
                onUpdateConfig("items", [
                  ...items,
                  {
                    id: makeItemId("story"),
                    badge: "Destaque",
                    title: "Novo Story / Encarte",
                    subtitle: "Toque para ampliar ou abrir link",
                    ctaLabel: "Conferir",
                    href: "#ofertas",
                  },
                ]);
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1"
            >
              <Plus className="size-4" />
              <span>Card</span>
            </Button>
          </div>

          {(Array.isArray(config.items) ? config.items : []).map((item: any, idx: number, arr: any[]) => {
            const updateItem = (patch: Record<string, any>) => {
              const next = [...arr];
              next[idx] = { ...item, ...patch };
              onUpdateConfig("items", next);
            };
            return (
              <ArrayItemCard
                key={item.id || idx}
                index={idx}
                total={arr.length}
                defaultOpen={idx === 0}
                title={item.title}
                subtitle={item.badge || undefined}
                onMoveUp={() => onUpdateConfig("items", moveArrayElement(arr, idx, "up"))}
                onMoveDown={() => onUpdateConfig("items", moveArrayElement(arr, idx, "down"))}
                onDuplicate={() => {
                  const next = [...arr];
                  next.splice(idx + 1, 0, { ...item, id: makeItemId("story") });
                  onUpdateConfig("items", next);
                }}
                onRemove={() => onUpdateConfig("items", arr.filter((_, i) => i !== idx))}
              >
                <BidirectionalMediaUploader
                  label="Capa Vertical (Mobile & Desktop)"
                  bucket="banners"
                  folder="stories"
                  mobileUrl={item.imageMobileUrl || item.imageUrl || ""}
                  desktopUrl={item.imageDesktopUrl || item.imageUrl || ""}
                  mobileAspect={bannerAspectToNumber(config.mobileFormat, 9 / 16)}
                  desktopAspect={bannerAspectToNumber(config.desktopFormat, 9 / 16)}
                  onMobileChange={(url) => updateItem({ imageMobileUrl: url })}
                  onDesktopChange={(url) => updateItem({ imageDesktopUrl: url })}
                />

                <Input
                  value={item.videoUrl || ""}
                  onChange={(e) =>
                    updateItem({
                      videoUrl: e.target.value,
                      mediaType: e.target.value ? "video" : "image",
                    })
                  }
                  placeholder="URL de vídeo .mp4 (Reels / Bastidores opcional)"
                  className={INPUT_CLASS}
                />

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={item.badge || ""}
                    onChange={(e) => updateItem({ badge: e.target.value })}
                    placeholder="Selo superior"
                    className={INPUT_CLASS}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.priceCents !== undefined ? (item.priceCents / 100).toFixed(2) : ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      updateItem({
                        priceCents: raw ? Math.round(Number(raw) * 100) : undefined,
                      });
                    }}
                    placeholder="Preço R$ (opcional)"
                    className={INPUT_CLASS}
                  />
                </div>

                <Input
                  value={item.title || ""}
                  onChange={(e) => updateItem({ title: e.target.value })}
                  placeholder="Título do card"
                  className={INPUT_CLASS}
                />

                <Input
                  value={item.subtitle || ""}
                  onChange={(e) => updateItem({ subtitle: e.target.value })}
                  placeholder="Subtítulo opcional"
                  className={INPUT_CLASS}
                />

                <Input
                  value={item.ctaLabel || ""}
                  onChange={(e) => updateItem({ ctaLabel: e.target.value })}
                  placeholder="Texto do botão no modal / card"
                  className={INPUT_CLASS}
                />

                <DestinationPicker
                  label="Link de Ação (Opcional)"
                  value={item.href || ""}
                  onChange={(url) => updateItem({ href: url })}
                />
              </ArrayItemCard>
            );
          })}
        </div>
      ) : null}

      

      {/* 10. EDITOR DE PRODUTOS MANUAIS */}
      {type === "vitrine_product_shelf" && config.dataSource === "manual" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Ofertas Manuais ({Array.isArray(config.items) ? config.items.length : 0})
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const items = Array.isArray(config.items) ? config.items : [];
                onUpdateConfig("items", [
                  ...items,
                  {
                    id: makeItemId("prod"),
                    title: "Produto em Destaque",
                    priceCents: 4990,
                    badge: "Oferta",
                    ctaLabel: config.ctaLabel || "Ver Oferta",
                    href: "#contato",
                  },
                ]);
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1"
            >
              <Plus className="size-4" />
              <span>Oferta</span>
            </Button>
          </div>

          {(Array.isArray(config.items) ? config.items : []).map((item: any, idx: number, arr: any[]) => {
            const updateItem = (patch: Record<string, any>) => {
              const next = [...arr];
              next[idx] = { ...item, ...patch };
              onUpdateConfig("items", next);
            };
            return (
              <ArrayItemCard
                key={item.id || idx}
                index={idx}
                total={arr.length}
                defaultOpen={idx === 0}
                title={item.title}
                onMoveUp={() => onUpdateConfig("items", moveArrayElement(arr, idx, "up"))}
                onMoveDown={() => onUpdateConfig("items", moveArrayElement(arr, idx, "down"))}
                onDuplicate={() => {
                  const next = [...arr];
                  next.splice(idx + 1, 0, { ...item, id: makeItemId("prod") });
                  onUpdateConfig("items", next);
                }}
                onRemove={() => onUpdateConfig("items", arr.filter((_, i) => i !== idx))}
              >
                <Input
                  value={item.title || ""}
                  onChange={(e) => updateItem({ title: e.target.value })}
                  placeholder="Nome do produto ou oferta"
                  className={INPUT_CLASS}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-2xs font-semibold text-muted-foreground mb-1">
                      Preço Atual (R$)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={((item.priceCents || 0) / 100).toFixed(2)}
                      onChange={(e) =>
                        updateItem({ priceCents: Math.max(0, Math.round(Number(e.target.value) * 100)) })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-muted-foreground mb-1">
                      Preço De (R$ opc.)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.originalPriceCents ? (item.originalPriceCents / 100).toFixed(2) : ""}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        updateItem({
                          originalPriceCents: raw ? Math.round(Number(raw) * 100) : undefined,
                        });
                      }}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={item.badge || ""}
                    onChange={(e) => updateItem({ badge: e.target.value })}
                    placeholder="Selo (ex: Mais Vendido)"
                    className={INPUT_CLASS}
                  />
                  <Input
                    value={item.sellingUnit || ""}
                    onChange={(e) => updateItem({ sellingUnit: e.target.value })}
                    placeholder="Unidade (ex: kg, un)"
                    className={INPUT_CLASS}
                  />
                </div>

                <MediaUploader
                  label="Foto do Produto"
                  bucket="post-media"
                  folder="produtos"
                  maxFiles={1}
                  aspect={config.cardAspect === "square" ? 1 : 4 / 3}
                  value={item.imageUrl ? [item.imageUrl] : []}
                  onChange={(urls) => updateItem({ imageUrl: urls[0] || "" })}
                />

                <DestinationPicker
                  label="Destino do Botão"
                  value={item.href || ""}
                  onChange={(url) => updateItem({ href: url })}
                />
              </ArrayItemCard>
            );
          })}
        </div>
      ) : null}

      

      {/* 11. EDITOR DE ANÚNCIOS MANUAIS */}
      {type === "vitrine_classifieds_rail" && config.dataSource === "manual" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Anúncios Manuais ({Array.isArray(config.items) ? config.items.length : 0})
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const items = Array.isArray(config.items) ? config.items : [];
                onUpdateConfig("items", [
                  ...items,
                  {
                    id: makeItemId("ad"),
                    title: "Novo Anúncio em Destaque",
                    priceCents: 120000,
                    niche: "general",
                    location: "Centro",
                    specs: ["Pronta entrega"],
                    ctaLabel: config.ctaLabel || "Ver Anúncio",
                    href: "#contato",
                  },
                ]);
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1"
            >
              <Plus className="size-4" />
              <span>Anúncio</span>
            </Button>
          </div>

          {(Array.isArray(config.items) ? config.items : []).map((item: any, idx: number, arr: any[]) => {
            const updateItem = (patch: Record<string, any>) => {
              const next = [...arr];
              next[idx] = { ...item, ...patch };
              onUpdateConfig("items", next);
            };
            return (
              <ArrayItemCard
                key={item.id || idx}
                index={idx}
                total={arr.length}
                defaultOpen={idx === 0}
                title={item.title}
                subtitle={item.location || undefined}
                onMoveUp={() => onUpdateConfig("items", moveArrayElement(arr, idx, "up"))}
                onMoveDown={() => onUpdateConfig("items", moveArrayElement(arr, idx, "down"))}
                onDuplicate={() => {
                  const next = [...arr];
                  next.splice(idx + 1, 0, { ...item, id: makeItemId("ad") });
                  onUpdateConfig("items", next);
                }}
                onRemove={() => onUpdateConfig("items", arr.filter((_, i) => i !== idx))}
              >
                <Input
                  value={item.title || ""}
                  onChange={(e) => updateItem({ title: e.target.value })}
                  placeholder="Título do anúncio"
                  className={INPUT_CLASS}
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={item.niche || "general"}
                    onChange={(e) => updateItem({ niche: e.target.value })}
                    className={SELECT_CLASS}
                  >
                    <option value="vehicles">Veículos</option>
                    <option value="real_estate">Imóveis</option>
                    <option value="tourism">Turismo</option>
                    <option value="services">Serviços</option>
                    <option value="general">Geral</option>
                  </select>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.priceCents !== undefined ? (item.priceCents / 100).toFixed(2) : ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      updateItem({
                        priceCents: raw ? Math.round(Number(raw) * 100) : undefined,
                      });
                    }}
                    placeholder="Valor R$"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={item.location || ""}
                    onChange={(e) => updateItem({ location: e.target.value })}
                    placeholder="Bairro / Cidade"
                    className={INPUT_CLASS}
                  />
                  <Input
                    value={item.priceLabel || ""}
                    onChange={(e) => updateItem({ priceLabel: e.target.value })}
                    placeholder="Ou rótulo (ex: Sob consulta)"
                    className={INPUT_CLASS}
                  />
                </div>

                <Input
                  value={Array.isArray(item.specs) ? item.specs.join(", ") : ""}
                  onChange={(e) =>
                    updateItem({
                      specs: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Destaques separados por vírgula (ex: 2024, Automático)"
                  className={INPUT_CLASS}
                />

                <MediaUploader
                  label="Foto do Anúncio"
                  bucket="post-media"
                  folder="classifieds"
                  maxFiles={1}
                  aspect={4 / 3}
                  value={item.imageUrl ? [item.imageUrl] : []}
                  onChange={(urls) => updateItem({ imageUrl: urls[0] || "" })}
                />

                <DestinationPicker
                  label="Link do Anúncio"
                  value={item.href || ""}
                  onChange={(url) => updateItem({ href: url })}
                />
              </ArrayItemCard>
            );
          })}
        </div>
      ) : null}

      

      {/* 12. EDITOR DE POSTS SOCIAIS MANUAIS */}
      {type === "vitrine_social_stream" && config.dataSource === "manual" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Publicações ({Array.isArray(config.items) ? config.items.length : 0})
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const items = Array.isArray(config.items) ? config.items : [];
                onUpdateConfig("items", [
                  ...items,
                  {
                    id: makeItemId("post"),
                    authorName: "Perfil Oficial",
                    authorHandle: "@oficial",
                    isVerified: true,
                    publishedLabel: "Agora",
                    content: "Confira os bastidores e novidades da nossa operação.",
                    mediaType: "none",
                    ctaLabel: "Ver mais",
                    href: "#contato",
                  },
                ]);
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1"
            >
              <Plus className="size-4" />
              <span>Post</span>
            </Button>
          </div>

          {(Array.isArray(config.items) ? config.items : []).map((item: any, idx: number, arr: any[]) => {
            const updateItem = (patch: Record<string, any>) => {
              const next = [...arr];
              next[idx] = { ...item, ...patch };
              onUpdateConfig("items", next);
            };
            return (
              <ArrayItemCard
                key={item.id || idx}
                index={idx}
                total={arr.length}
                defaultOpen={idx === 0}
                title={item.authorName || "Publicação"}
                subtitle={item.content?.slice(0, 40)}
                onMoveUp={() => onUpdateConfig("items", moveArrayElement(arr, idx, "up"))}
                onMoveDown={() => onUpdateConfig("items", moveArrayElement(arr, idx, "down"))}
                onDuplicate={() => {
                  const next = [...arr];
                  next.splice(idx + 1, 0, { ...item, id: makeItemId("post") });
                  onUpdateConfig("items", next);
                }}
                onRemove={() => onUpdateConfig("items", arr.filter((_, i) => i !== idx))}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={item.authorName || ""}
                    onChange={(e) => updateItem({ authorName: e.target.value })}
                    placeholder="Nome do autor"
                    className={INPUT_CLASS}
                  />
                  <Input
                    value={item.authorHandle || ""}
                    onChange={(e) => updateItem({ authorHandle: e.target.value })}
                    placeholder="@usuario"
                    className={INPUT_CLASS}
                  />
                </div>

                <Textarea
                  rows={3}
                  value={item.content || ""}
                  onChange={(e) => updateItem({ content: e.target.value })}
                  placeholder="Texto da publicação (se sem mídia, renderiza cartão tipográfico limpo)"
                  className="rounded-lg text-xs resize-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={item.mediaType || "none"}
                    onChange={(e) => updateItem({ mediaType: e.target.value })}
                    className={SELECT_CLASS}
                  >
                    <option value="none">Somente Texto</option>
                    <option value="image">Com Foto</option>
                    <option value="video">Com Vídeo MP4</option>
                  </select>
                  <Input
                    value={item.publishedLabel || ""}
                    onChange={(e) => updateItem({ publishedLabel: e.target.value })}
                    placeholder="Ex: Hoje"
                    className={INPUT_CLASS}
                  />
                </div>

                {item.mediaType === "image" ? (
                  <MediaUploader
                    label="Foto do Post"
                    bucket="post-media"
                    folder="posts"
                    maxFiles={1}
                    aspect={4 / 3}
                    value={item.mediaUrl ? [item.mediaUrl] : []}
                    onChange={(urls) => updateItem({ mediaUrl: urls[0] || "" })}
                  />
                ) : null}

                {item.mediaType === "video" ? (
                  <Input
                    value={item.mediaUrl || ""}
                    onChange={(e) => updateItem({ mediaUrl: e.target.value })}
                    placeholder="URL do vídeo .mp4"
                    className={INPUT_CLASS}
                  />
                ) : null}

                <DestinationPicker
                  label="Link do Post (Opcional)"
                  value={item.href || ""}
                  onChange={(url) => updateItem({ href: url })}
                />
              </ArrayItemCard>
            );
          })}
        </div>
      ) : null}

      

      {/* 13. EDITOR MANUAL DE CONEXÕES DO ECOSSISTEMA */}
      {type === "vitrine_ecosystem_rail" && config.dataSource === "manual" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Cards Manuais ({Array.isArray(config.items) ? config.items.length : 0})
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const items = Array.isArray(config.items) ? config.items : [];
                onUpdateConfig("items", [
                  ...items,
                  {
                    id: makeItemId("eco"),
                    title: "Destaque Oficial",
                    subtitle: "Descrição objetiva",
                    badge: "Oficial",
                    isVerified: true,
                    ctaLabel: "Acessar",
                    href: "#contato",
                  },
                ]);
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1"
            >
              <Plus className="size-4" />
              <span>Card</span>
            </Button>
          </div>

          {(Array.isArray(config.items) ? config.items : []).map((item: any, idx: number, arr: any[]) => {
            const updateItem = (patch: Record<string, any>) => {
              const next = [...arr];
              next[idx] = { ...item, ...patch };
              onUpdateConfig("items", next);
            };
            return (
              <ArrayItemCard
                key={item.id || idx}
                index={idx}
                total={arr.length}
                defaultOpen={idx === 0}
                title={item.title}
                subtitle={item.metaPrimary || item.subtitle}
                onMoveUp={() => onUpdateConfig("items", moveArrayElement(arr, idx, "up"))}
                onMoveDown={() => onUpdateConfig("items", moveArrayElement(arr, idx, "down"))}
                onDuplicate={() => {
                  const next = [...arr];
                  next.splice(idx + 1, 0, { ...item, id: makeItemId("eco") });
                  onUpdateConfig("items", next);
                }}
                onRemove={() => onUpdateConfig("items", arr.filter((_, i) => i !== idx))}
              >
                <Input
                  value={item.title || ""}
                  onChange={(e) => updateItem({ title: e.target.value })}
                  placeholder="Título do item"
                  className={INPUT_CLASS}
                />
                <Input
                  value={item.subtitle || ""}
                  onChange={(e) => updateItem({ subtitle: e.target.value })}
                  placeholder="Subtítulo / Categoria"
                  className={INPUT_CLASS}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={item.metaPrimary || ""}
                    onChange={(e) => updateItem({ metaPrimary: e.target.value })}
                    placeholder="Data / Salário / Cidade"
                    className={INPUT_CLASS}
                  />
                  <Input
                    value={item.metaSecondary || ""}
                    onChange={(e) => updateItem({ metaSecondary: e.target.value })}
                    placeholder="Local / Regime"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={item.badge || ""}
                    onChange={(e) => updateItem({ badge: e.target.value })}
                    placeholder="Selo"
                    className={INPUT_CLASS}
                  />
                  <Input
                    value={item.ctaLabel || ""}
                    onChange={(e) => updateItem({ ctaLabel: e.target.value })}
                    placeholder="Texto do botão"
                    className={INPUT_CLASS}
                  />
                </div>
                <MediaUploader
                  label="Imagem / Capa (Opcional)"
                  bucket="post-media"
                  folder="hotpages"
                  maxFiles={1}
                  aspect={16 / 9}
                  value={item.imageUrl ? [item.imageUrl] : []}
                  onChange={(urls) => updateItem({ imageUrl: urls[0] || "" })}
                />
                <DestinationPicker
                  label="Destino do Card"
                  value={item.href || ""}
                  onChange={(url) => updateItem({ href: url })}
                />
              </ArrayItemCard>
            );
          })}
        </div>
      ) : null}

      
    </div>
  );
};

export interface BidirectionalDeviceStylingFieldsProps {
  styling?: OmniBlockStyling;
  onUpdateStyling: (key: keyof OmniBlockStyling, value: any) => void;
  sectionAnchorId?: string;
  onUpdateSectionAnchorId?: (anchorId: string) => void;
}

export const BidirectionalDeviceStylingFields: React.FC<BidirectionalDeviceStylingFieldsProps> = ({
  styling,
  onUpdateStyling,
  sectionAnchorId,
  onUpdateSectionAnchorId,
}) => {
  return (
    <div className="space-y-4 pt-3 border-t border-border/60">
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          Visibilidade por Dispositivo
        </label>
        <select
          value={styling?.deviceVisibility || "all"}
          onChange={(e) => onUpdateStyling("deviceVisibility", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="all">Visível em Mobile e Desktop</option>
          <option value="mobile_only">Exclusivo Mobile (&lt; 600px)</option>
          <option value="desktop_only">Exclusivo Desktop (≥ 840px)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          Espaçamento Mobile Independente
        </label>
        <select
          value={styling?.mobilePaddingY || ""}
          onChange={(e) =>
            onUpdateStyling("mobilePaddingY", e.target.value ? e.target.value : undefined)
          }
          className={SELECT_CLASS}
        >
          <option value="">Automático (Proporcional ao Desktop)</option>
          <option value="none">Zero (Colado)</option>
          <option value="xs">Ultra Compacto (8px)</option>
          <option value="sm">Compacto App (16px)</option>
          <option value="md">Médio (24px)</option>
          <option value="lg">Amplo (40px)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          Superfície Tonal Canônica
        </label>
        <select
          value={styling?.surfacePreset || "default"}
          onChange={(e) => onUpdateStyling("surfacePreset", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="default">Padrão da Página</option>
          <option value="muted">Superfície Suave (Muted)</option>
          <option value="card">Cartão Destacado (Card)</option>
          <option value="brand_tint">Tonalidade da Marca</option>
          <option value="contrast">Alto Contraste Invertido</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Largura Máx.
          </label>
          <select
            value={styling?.maxWidth || "7xl"}
            onChange={(e) => onUpdateStyling("maxWidth", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="7xl">Padrão App (7xl)</option>
            <option value="full">Sangria Total</option>
            <option value="5xl">Editorial (5xl)</option>
            <option value="3xl">Compacto (3xl)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Moldura / Divisor
          </label>
          <select
            value={styling?.border ? String(styling.border) : "none"}
            onChange={(e) => onUpdateStyling("border", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="none">Sem Borda</option>
            <option value="subtle">Sutil</option>
            <option value="card">Card</option>
            <option value="divider_y">Divisor H</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          Animação de Entrada
        </label>
        <select
          value={styling?.scrollAnimation || "none"}
          onChange={(e) => onUpdateStyling("scrollAnimation", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="none">Instantâneo (Zero Motion)</option>
          <option value="fade">Fade Suave</option>
          <option value="slide-up">Elevação Sutil</option>
          <option value="zoom-in">Escala Sutil</option>
        </select>
      </div>

      {onUpdateSectionAnchorId ? (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Âncora da Seção (#link)
          </label>
          <Input
            value={sectionAnchorId || ""}
            onChange={(e) =>
              onUpdateSectionAnchorId(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9_-]/g, "")
                  .slice(0, 64),
              )
            }
            placeholder="ex: ofertas, cardapio, contato"
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>
      ) : null}
    </div>
  );
};
