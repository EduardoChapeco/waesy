import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plus,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  Layout,
  Sliders,
  Layers,
  Image as ImageIcon,
  Eye,
  CheckCircle2,
  Grid,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MediaUploader } from "@/components/ui/media-uploader";
import { BidirectionalMediaUploader } from "@/components/ui/bidirectional-media-uploader";
import { DestinationPicker } from "@/components/ui/destination-picker";
import {
  listAdminHomePageSections,
  upsertHomePageSection,
  deleteHomePageSection,
  upsertHomeSectionItem,
  deleteHomeSectionItem,
  reorderHomeSections,
  reorderHomeSectionItems,
  type HomePageSectionDTO,
  type HomeSectionItemDTO,
  type HomeLayoutVariant,
  type HomeAspectRatio,
} from "@/services/admin-home-cms.functions";
import { MetamorphicBannerSlider } from "@/components/home/MetamorphicBannerSlider";
import { NoorNativeCategoryDock } from "@/components/home/NoorNativeCategoryDock";
import { BentoGridTetris } from "@/components/home/BentoGridTetris";
import { IFoodSquareCategoryButton } from "@/components/home/IFoodSquareCategoryButton";

export const Route = createFileRoute("/admin-master/home-editor")({
  head: () => ({ meta: [{ title: "Home Page Builder (CMS) | Admin Master" }] }),
  loader: async () => {
    try {
      const sections = await listAdminHomePageSections().catch(() => []);
      return { sections };
    } catch (err) {
      console.error("[loader:admin-master.home-editor] Erro:", err);
      return { sections: [] };
    }
  },
  component: AdminMasterHomeEditorPage,
});

const LAYOUT_VARIANTS: Array<{ id: HomeLayoutVariant; label: string; desc: string }> = [
  { id: "slim_slider", label: "Slider Fino Widescreen (28:9)", desc: "Carrossel panorâmico elegante e sem cortes para Desktop e Mobile" },
  { id: "carousel", label: "Carrossel Deslizante (Banner)", desc: "Trilho com snap scroll horizontal e dots" },
  { id: "cards_action_grid", label: "Grade de Cards / Botões (2x2)", desc: "Cards clicáveis estilo botão com ícone ou background personalizado" },
  { id: "custom_buttons", label: "Botões de Ação Personalizados", desc: "Grade de atalhos rápidos com background e badges configuráveis" },
  { id: "horizontal_scroll", label: "Menu Deslizante (Noor / iFood)", desc: "Trilho contínuo sem quebra de linha" },
  { id: "bento_grid", label: "Bento Grid Modular (Tetris)", desc: "Composição em blocos com spans flexíveis" },
  { id: "grid_2d", label: "Grade Bidimensional (4 Colunas)", desc: "Grade estática em colunas uniformes" },
  { id: "native_dock", label: "Dock Flutuante Nativo", desc: "Barra de atalhos rápidos com física elástica" },
];

const ASPECT_RATIOS: Array<{ id: HomeAspectRatio; label: string; ratioDesc: string }> = [
  { id: "slim_desktop", label: "Desktop Fino Panorâmico (28:9)", ratioDesc: "Slider fino anti-corte para desktops e monitores ultrawide" },
  { id: "ifood", label: "iFood Panorâmico (21:9)", ratioDesc: "Ideal para banners horizontais mobile" },
  { id: "16:9", label: "Cinema / Vídeo (16:9)", ratioDesc: "Proporção universal widescreen" },
  { id: "4:3", label: "Clássico Fotográfico (4:3)", ratioDesc: "Proporção editorial para fotos" },
  { id: "1:1", label: "Quadrado Perfeito (1:1)", ratioDesc: "Botões de categorias e ícones iFood" },
  { id: "4:5", label: "Vertical Feed (4:5)", ratioDesc: "Proporção vertical clássica de posts e cards" },
  { id: "9:16", label: "Story / Reels Vertical (9:16)", ratioDesc: "Proporção de vídeo e momento" },
  { id: "auto", label: "Automático / Responsivo", ratioDesc: "Ajuste dinâmico conforme conteúdo" },
];


export const CANONICAL_PRESETS = [
  { key: "hero_banners", title: "Destaques Principais", layout: "carousel", aspect: "ifood", desc: "Carrossel panorâmico principal com paginação em traços" },
  { key: "quick_categories_ifood", title: "Categorias Principais", layout: "horizontal_scroll", aspect: "1:1", desc: "Dock 5x2 de categorias com 10 atalhos" },
  { key: "feature_mini_banners", title: "No Waesy também tem", layout: "carousel", aspect: "4:5", desc: "Mini-banners verticais de vantagens e serviços" },
  { key: "spotlight_restaurants", title: "Restaurantes com Cupom", layout: "horizontal_scroll", aspect: "4:3", desc: "Trilho com cards visuais apetitosos, nota, coroa e entrega" },
  { key: "spotlight_pharmacies", title: "Farmácias Famosas", layout: "horizontal_scroll", aspect: "4:3", desc: "Trilho de drogarias e saúde com tempo de entrega" },
  { key: "marketplace_products_rail", title: "Marketplace de Empresas", layout: "carousel", aspect: "1:1", desc: "Trilho com produtos de lojas credenciadas" },
  { key: "classifieds_rail", title: "Classificados & Desapegos", layout: "carousel", aspect: "4:3", desc: "Trilho com classificados recentes de veículos, imóveis e produtos" },
  { key: "places_directory_rail", title: "Lugares e Empresas", layout: "horizontal_scroll", aspect: "16:9", desc: "Guia comercial com contato direto de WhatsApp" },
  { key: "jobs_rail", title: "Vagas de Emprego", layout: "carousel", aspect: "16:9", desc: "Vagas de trabalho recentes na cidade" },
  { key: "procedural_infinite_feed", title: "Descoberta Procedural Contínua", layout: "grid_2d", aspect: "auto", desc: "Feed algorítmico contínuo intercalando produtos, anúncios e lojas" },
  { key: "vertical_reels_carousel", title: "Carrossel Vertical / Reels", layout: "carousel", aspect: "9:16", desc: "Stories e vídeos curtos verticais 9:16 de alta conversão" },
  { key: "mosaic_gallery_showcase", title: "Galeria Mosaico", layout: "bento_grid", aspect: "4:3", desc: "Mosaico editorial de fotos e banners clicáveis" },
  { key: "canonical_video_player", title: "Player de Vídeo Canônico", layout: "slim_slider", aspect: "16:9", desc: "Seção de vídeo widescreen com CTA de conversão" },
  { key: "car_rental_3days_rail", title: "Aluguel de Carros 3 Diárias", layout: "carousel", aspect: "16:9", desc: "Frota de locação com regra de reserva mínima de 3 diárias" },
];

function AdminMasterHomeEditorPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const [sections, setSections] = useState<HomePageSectionDTO[]>(loaderData.sections || []);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");


  // Estados de edição de Seção
  const [editingSection, setEditingSection] = useState<HomePageSectionDTO | null>(null);
  const [secKey, setSecKey] = useState("");
  const [secTitle, setSecTitle] = useState("");
  const [secSubtitle, setSecSubtitle] = useState("");
  const [secShowTitle, setSecShowTitle] = useState(false);
  const [secShowSubtitle, setSecShowSubtitle] = useState(false);
  const [secLayout, setSecLayout] = useState<HomeLayoutVariant>("carousel");
  const [secAspect, setSecAspect] = useState<HomeAspectRatio>("ifood");
  const [secIsActive, setSecIsActive] = useState(true);

  // Estados de edição de Item
  const [selectedSectionForNewItem, setSelectedSectionForNewItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<HomeSectionItemDTO | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemSubtitle, setItemSubtitle] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemImageDesktopUrl, setItemImageDesktopUrl] = useState("");
  const [itemImageMobileUrl, setItemImageMobileUrl] = useState("");
  const [itemBgColor, setItemBgColor] = useState("");
  const [itemIconName, setItemIconName] = useState("");
  const [itemTargetUrl, setItemTargetUrl] = useState("/");
  const [itemShowText, setItemShowText] = useState(false);
  const [itemBadgeText, setItemBadgeText] = useState("");
  const [itemSpanX, setItemSpanX] = useState(1);
  const [itemSpanY, setItemSpanY] = useState(1);
  const [itemStartsAt, setItemStartsAt] = useState("");
  const [itemEndsAt, setItemEndsAt] = useState("");
  const [itemIsActive, setItemIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const refreshSections = async () => {
    try {
      const data = await listAdminHomePageSections();
      setSections(data || []);
    } catch (e: any) {
      toast.error("Erro ao sincronizar seções: " + e.message);
    }
  };

  // ── Abertura de Modal de Seção ──
  const openNewSectionDialog = () => {
    setEditingSection(null);
    setSecKey(`section_${Date.now().toString().slice(-4)}`);
    setSecTitle("");
    setSecSubtitle("");
    setSecShowTitle(false);
    setSecShowSubtitle(false);
    setSecLayout("carousel");
    setSecAspect("ifood");
    setSecIsActive(true);
    setIsSectionDialogOpen(true);
  };

  const openEditSectionDialog = (sec: HomePageSectionDTO) => {
    setEditingSection(sec);
    setSecKey(sec.section_key);
    setSecTitle(sec.title || "");
    setSecSubtitle(sec.subtitle || "");
    setSecShowTitle(sec.show_title);
    setSecShowSubtitle(sec.show_subtitle);
    setSecLayout(sec.layout_variant);
    setSecAspect(sec.aspect_ratio);
    setSecIsActive(sec.is_active);
    setIsSectionDialogOpen(true);
  };

  const handleSaveSection = async () => {
    if (!secKey.trim()) {
      toast.error("Identificador (chave) da seção é obrigatório.");
      return;
    }
    setIsSaving(true);
    try {
      await upsertHomePageSection({
        data: {
          id: editingSection?.id,
          section_key: secKey.trim().toLowerCase(),
          title: secTitle.trim() || null,
          subtitle: secSubtitle.trim() || null,
          show_title: secShowTitle,
          show_subtitle: secShowSubtitle,
          layout_variant: secLayout,
          aspect_ratio: secAspect,
          is_active: secIsActive,
          sort_order: editingSection?.sort_order ?? sections.length,
        },
      });
      toast.success(editingSection ? "Seção atualizada!" : "Seção criada com sucesso!");
      setIsSectionDialogOpen(false);
      await refreshSections();
    } catch (e: any) {
      toast.error("Falha ao salvar seção: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSection = async (id: string) => {
    try {
      await deleteHomePageSection({ data: { id } });
      toast.success("Seção removida!");
      await refreshSections();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    }
  };

  // ── Abertura de Modal de Item ──
  const openNewItemDialog = (sectionId: string) => {
    setSelectedSectionForNewItem(sectionId);
    setEditingItem(null);
    setItemTitle("");
    setItemSubtitle("");
    setItemImageUrl("");
    setItemImageDesktopUrl("");
    setItemImageMobileUrl("");
    setItemBgColor("");
    setItemIconName("");
    setItemTargetUrl("/");
    setItemShowText(false);
    setItemBadgeText("");
    setItemSpanX(1);
    setItemSpanY(1);
    setItemStartsAt("");
    setItemEndsAt("");
    setItemIsActive(true);
    setIsItemDialogOpen(true);
  };

  const openEditItemDialog = (sectionId: string, item: HomeSectionItemDTO) => {
    setSelectedSectionForNewItem(sectionId);
    setEditingItem(item);
    setItemTitle(item.title || "");
    setItemSubtitle(item.subtitle || "");
    setItemImageUrl(item.image_url || "");
    setItemImageDesktopUrl(item.image_desktop_url || "");
    setItemImageMobileUrl(item.image_mobile_url || "");
    setItemBgColor(item.bg_color || "");
    setItemIconName(item.icon_name || "");
    setItemTargetUrl(item.target_url);
    setItemShowText(item.show_text);
    setItemBadgeText(item.badge_text || "");
    setItemSpanX(item.grid_span_x || 1);
    setItemSpanY(item.grid_span_y || 1);
    setItemStartsAt(item.starts_at ? item.starts_at.slice(0, 16) : "");
    setItemEndsAt(item.ends_at ? item.ends_at.slice(0, 16) : "");
    setItemIsActive(item.is_active);
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!selectedSectionForNewItem) return;
    if (!itemImageUrl.trim()) {
      toast.error("Selecione ou envie uma imagem válida.");
      return;
    }
    setIsSaving(true);
    try {
      const sec = sections.find((s) => s.id === selectedSectionForNewItem);
      const currentItemsCount = sec?.items?.length || 0;

      await upsertHomeSectionItem({
        data: {
          id: editingItem?.id,
          section_id: selectedSectionForNewItem,
          title: itemTitle.trim() || null,
          subtitle: itemSubtitle.trim() || null,
          image_url: itemImageUrl.trim(),
          image_desktop_url: itemImageDesktopUrl.trim() || null,
          image_mobile_url: itemImageMobileUrl.trim() || null,
          bg_color: itemBgColor.trim() || null,
          icon_name: itemIconName.trim() || null,
          starts_at: itemStartsAt ? new Date(itemStartsAt).toISOString() : null,
          ends_at: itemEndsAt ? new Date(itemEndsAt).toISOString() : null,
          target_url: itemTargetUrl.trim() || "/",
          show_text: itemShowText,
          grid_span_x: itemSpanX,
          grid_span_y: itemSpanY,
          badge_text: itemBadgeText.trim() || null,
          is_active: itemIsActive,
          sort_order: editingItem?.sort_order ?? currentItemsCount,
        },
      });
      toast.success(editingItem ? "Card atualizado!" : "Novo card cadastrado!");
      setIsItemDialogOpen(false);
      await refreshSections();
    } catch (e: any) {
      toast.error("Falha ao salvar item: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteHomeSectionItem({ data: { id } });
      toast.success("Card removido!");
      await refreshSections();
    } catch (e: any) {
      toast.error("Erro ao remover: " + e.message);
    }
  };

  const moveSection = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newSections = [...sections];
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;
    setSections(newSections);

    try {
      await reorderHomeSections({
        data: { sectionIds: newSections.map((s) => s.id) },
      });
      toast.success("Ordem das seções salva!");
    } catch (e: any) {
      toast.error("Falha ao reordenar: " + e.message);
      await refreshSections();
    }
  };

  const moveItem = async (sec: HomePageSectionDTO, itemIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;
    if (targetIndex < 0 || targetIndex >= sec.items.length) return;

    const newItems = [...sec.items];
    const temp = newItems[itemIndex];
    newItems[itemIndex] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const newSections = sections.map((s) => (s.id === sec.id ? { ...s, items: newItems } : s));
    setSections(newSections);

    try {
      await reorderHomeSectionItems({
        data: { itemIds: newItems.map((i) => i.id) },
      });
      toast.success("Ordem dos cards salva!");
    } catch (e: any) {
      toast.error("Falha ao reordenar itens: " + e.message);
      await refreshSections();
    }
  };


  const filteredSections = sections.filter((s) => {
    if (statusFilter === "active" && !s.is_active) return false;
    if (statusFilter === "inactive" && s.is_active) return false;
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      const matchKey = s.section_key.toLowerCase().includes(q);
      const matchTitle = (s.title || "").toLowerCase().includes(q);
      if (!matchKey && !matchTitle) return false;
    }
    return true;
  });

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── Top Header Canônico ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Home Page Builder (CMS)
            </h1>
            <Badge variant="outline" className="text-3xs uppercase tracking-wider font-bold">
              Omni-Builder 3.0
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Edição visual ponta a ponta da página inicial: controle cards limpos para upload de mídia,
            menus horizontais nativos estilo Noor, botões quadrados estilo iFood e grades Bento Grid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2 h-11 min-h-11"
          >
            <Link to="/workspace/marketing/vitrine">
              <Sparkles size={16} />
              <span>Abrir Omni Studio (Modo Wix)</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2 h-11 min-h-11"
          >
            <Link to="/admin-master/hubs">
              <Layers size={16} />
              <span>Editar Hotpages & Categorias</span>
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="gap-2 min-h-11"
          >
            <Eye size={16} />
            <span>{showLivePreview ? "Ocultar Preview" : "Ver Preview em Tempo Real"}</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={openNewSectionDialog}
            className="gap-2 min-h-11 font-bold"
          >
            <Plus size={16} />
            <span>Adicionar Seção</span>
          </Button>
        </div>
      </div>

      {/* ── Régua de Navegação Rápida entre Vitrines no Admin ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 border-b border-border/40">
        <Link
          to="/admin-master/home-editor"
          className="h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-bold shrink-0 transition-colors bg-primary text-primary-foreground flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Layout size={14} />
          <span>Home Principal</span>
        </Link>
        <Link
          to="/admin-master/vitrines"
          search={{ surface: "gastronomia" }}
          className="h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold shrink-0 transition-colors bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>Gastronomia</span>
        </Link>
        <Link
          to="/admin-master/vitrines"
          search={{ surface: "mercado" }}
          className="h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold shrink-0 transition-colors bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>Supermercado</span>
        </Link>
        <Link
          to="/admin-master/vitrines"
          search={{ surface: "farmacia" }}
          className="h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold shrink-0 transition-colors bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>Farmácia</span>
        </Link>
        <Link
          to="/admin-master/banners"
          className="h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold shrink-0 transition-colors bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ImageIcon size={14} />
          <span>Banners & Criativos</span>
        </Link>
        <Link
          to="/admin-master/botoes"
          className="h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold shrink-0 transition-colors bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/60 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Sliders size={14} />
          <span>Hotpages & Hubs</span>
        </Link>
      </div>

      {/* ── Barra de Filtros e Adição Rápida de Presets ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <Input
            placeholder="Filtrar seção por título ou chave..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="h-9 text-xs bg-background max-w-xs"
          />
          <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                statusFilter === "all" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas ({sections.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                statusFilter === "active" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ativas ({sections.filter((s) => s.is_active).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                statusFilter === "inactive" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Desativadas ({sections.filter((s) => !s.is_active).length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Select
            onValueChange={(val) => {
              const preset = CANONICAL_PRESETS.find((p) => p.key === val);
              if (preset) {
                setEditingSection(null);
                setSecKey(preset.key);
                setSecTitle(preset.title);
                setSecSubtitle(preset.desc);
                setSecShowTitle(true);
                setSecShowSubtitle(false);
                setSecLayout(preset.layout as HomeLayoutVariant);
                setSecAspect(preset.aspect as HomeAspectRatio);
                setSecIsActive(true);
                setIsSectionDialogOpen(true);
              }
            }}
          >
            <SelectTrigger className="h-9 text-xs font-semibold bg-background min-w-44">
              <SelectValue placeholder="Adicionar Preset Rápido..." />
            </SelectTrigger>
            <SelectContent>
              {CANONICAL_PRESETS.map((p) => (
                <SelectItem key={p.key} value={p.key} className="text-xs">
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Painel de Preview em Tempo Real (Opcional) ── */}
      {showLivePreview && (
        <div className="p-4 rounded-lg bg-muted/30 border border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <span className="text-xs font-bold text-foreground">Pré-Visualização Dinâmica</span>
            </div>
            <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-ring ${
                  previewMode === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-ring ${
                  previewMode === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Mobile (375px)
              </button>
            </div>
          </div>

          <div
            className={`mx-auto bg-card rounded-lg border border-border/80 p-4 transition-colors overflow-hidden ${
              previewMode === "mobile" ? "max-w-sm" : "w-full"
            }`}
          >
            <div className="space-y-6">
              {sections
                .filter((s) => s.is_active)
                .map((sec) => (
                  <div key={sec.id} className="space-y-2">
                    {sec.show_title && sec.title && (
                      <h3 className="text-sm font-bold text-foreground">{sec.title}</h3>
                    )}
                    {(sec.layout_variant === "carousel" || sec.layout_variant === "slim_slider") && (
                      <MetamorphicBannerSlider
                        items={sec.items}
                        aspectRatio={sec.layout_variant === "slim_slider" ? "slim_desktop" : sec.aspect_ratio}
                      />
                    )}
                    {sec.layout_variant === "horizontal_scroll" && (
                      <NoorNativeCategoryDock items={sec.items} />
                    )}
                    {sec.layout_variant === "bento_grid" && (
                      <BentoGridTetris items={sec.items} aspectRatio={sec.aspect_ratio} />
                    )}
                    {(sec.layout_variant === "grid_2d" ||
                      sec.layout_variant === "cards_action_grid" ||
                      sec.layout_variant === "custom_buttons") && (
                      <div
                        className={
                          sec.layout_variant === "cards_action_grid"
                            ? "grid grid-cols-2 gap-3"
                            : "grid grid-cols-2 sm:grid-cols-4 gap-3"
                        }
                      >
                        {sec.items.map((it) => (
                          <IFoodSquareCategoryButton
                            key={it.id}
                            title={it.title}
                            imageUrl={it.image_desktop_url || it.image_url}
                            targetUrl={it.target_url}
                            showText={it.show_text}
                            badgeText={it.badge_text}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de Seções da Home ── */}
      <div className="space-y-4">
        {filteredSections.map((section, secIdx) => (
          <div
            key={section.id}
            className={`p-4 sm:p-5 rounded-lg border transition-colors ${
              section.is_active
                ? "bg-card border-border/80"
                : "bg-muted/20 border-dashed border-border/50 opacity-60"
            }`}
          >
            {/* Header da Seção */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-primary">
                    #{secIdx + 1} {section.section_key}
                  </span>
                  <Badge variant="secondary" className="text-3xs font-semibold">
                    {LAYOUT_VARIANTS.find((l) => l.id === section.layout_variant)?.label || section.layout_variant}
                  </Badge>
                  <Badge variant="outline" className="text-3xs font-semibold">
                    Ratio: {section.aspect_ratio}
                  </Badge>
                  {!section.is_active && (
                    <Badge variant="destructive" className="text-3xs">
                      Desativada
                    </Badge>
                  )}
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {section.title || "(Sem título textual — Modo visual limpo)"}
                </h3>
                {section.subtitle && (
                  <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 pr-2 border-r border-border/40">
                  <span className="text-3xs font-bold text-muted-foreground uppercase">
                    {section.is_active ? "Ativa" : "Inativa"}
                  </span>
                  <Switch
                    checked={section.is_active}
                    onCheckedChange={async (checked) => {
                      try {
                        await upsertHomePageSection({
                          data: {
                            id: section.id,
                            section_key: section.section_key,
                            title: section.title,
                            subtitle: section.subtitle,
                            show_title: section.show_title,
                            show_subtitle: section.show_subtitle,
                            layout_variant: section.layout_variant,
                            aspect_ratio: section.aspect_ratio,
                            is_active: checked,
                            sort_order: section.sort_order,
                          },
                        });
                        toast.success(checked ? "Seção ativada na Home!" : "Seção desativada na Home!");
                        await refreshSections();
                      } catch (e: any) {
                        toast.error("Erro ao alterar visibilidade: " + e.message);
                      }
                    }}
                    aria-label={`Ativar ou desativar seção ${section.section_key}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  disabled={secIdx === 0}
                  onClick={() => moveSection(secIdx, "up")}
                  title="Mover para cima"
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  disabled={secIdx === sections.length - 1}
                  onClick={() => moveSection(secIdx, "down")}
                  title="Mover para baixo"
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 gap-1"
                  onClick={() => openEditSectionDialog(section)}
                >
                  <Pencil size={14} />
                  <span>Configurar</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 gap-1 font-bold"
                  onClick={() => openNewItemDialog(section.id)}
                >
                  <Plus size={14} />
                  <span>Novo Card</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteSection(section.id)}
                  title="Excluir seção"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            {/* Itens / Cards de Mídia da Seção */}
            <div className="pt-4">
              <div className="text-xs font-bold text-muted-foreground mb-3 flex items-center justify-between">
                <span>Cards de Mídia ({section.items?.length || 0})</span>
                <span className="text-3xs font-normal">
                  {section.items?.every((i) => !i.show_text)
                    ? "Modo Mídia Pura (sem textos excessivos)"
                    : "Misto (alguns cards exibem texto)"}
                </span>
              </div>

              {(!section.items || section.items.length === 0) ? (
                <div className="p-6 rounded-lg border border-dashed border-border/60 text-center space-y-2">
                  <ImageIcon size={24} className="mx-auto text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    Nenhum card cadastrado nesta seção. Clique em "Novo Card" para fazer upload de mídia.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {section.items.map((item, itIdx) => (
                    <div
                      key={item.id}
                      className="group relative rounded-lg border border-border/60 bg-muted/20 overflow-hidden flex flex-col justify-between"
                    >
                      <div className="relative aspect-video w-full bg-muted/50 overflow-hidden">
                        <img
                          src={item.image_url || undefined}
                          alt={item.title || ""}
                          className="size-full object-cover"
                        />
                        <div className="absolute top-1 left-1 flex items-center gap-1">
                          {item.badge_text && (
                            <Badge className="text-3xs px-1 py-0">{item.badge_text}</Badge>
                          )}
                          {!item.show_text && (
                            <Badge variant="outline" className="text-3xs px-1 py-0 bg-foreground/80 text-background border-none">
                              Sem texto
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="p-2 space-y-1">
                        <p className="text-xs font-bold text-foreground line-clamp-1">
                          {item.title || "(Sem texto)"}
                        </p>
                        <p className="text-3xs text-muted-foreground truncate font-mono">
                          {item.target_url}
                        </p>
                      </div>

                      <div className="p-1 border-t border-border/40 flex items-center justify-between bg-card/60">
                        <div className="flex items-center">
                          <button
                            type="button"
                            disabled={itIdx === 0}
                            onClick={() => moveItem(section, itIdx, "up")}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-ring"
                            title="Mover card à esquerda"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={itIdx === section.items.length - 1}
                            onClick={() => moveItem(section, itIdx, "down")}
                            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-ring"
                            title="Mover card à direita"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditItemDialog(section.id, item)}
                            className="p-2 text-primary hover:bg-primary/10 rounded focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-ring"
                            title="Editar card"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-ring"
                            title="Excluir card"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Dialog de Edição de Seção ── */}
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Editar Seção da Home" : "Nova Seção da Home"}
            </DialogTitle>
            <DialogDescription>
              Configure o comportamento visual, proporção de exibição e layout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold">Chave de Identificação (section_key)</Label>
              <Input
                value={secKey}
                onChange={(e) => setSecKey(e.target.value)}
                placeholder="ex: hero_banners, novidades_bento, categorias_ifood"
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Layout Visual</Label>
                <Select
                  value={secLayout}
                  onValueChange={(v) => setSecLayout(v as HomeLayoutVariant)}
                >
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_VARIANTS.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Proporção (Aspect Ratio)</Label>
                <Select
                  value={secAspect}
                  onValueChange={(v) => setSecAspect(v as HomeAspectRatio)}
                >
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Título da Seção (Opcional)</Label>
              <Input
                value={secTitle}
                onChange={(e) => setSecTitle(e.target.value)}
                placeholder="ex: Destaques da Cidade"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold">Subtítulo (Opcional)</Label>
              <Input
                value={secSubtitle}
                onChange={(e) => setSecSubtitle(e.target.value)}
                placeholder="ex: Ofertas selecionadas para hoje"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold">Exibir Título na Vitrine</Label>
                  <p className="text-3xs text-muted-foreground">
                    Desative para criar seções puramente visuais (cards/banners sem cabeçalho textual).
                  </p>
                </div>
                <Switch checked={secShowTitle} onCheckedChange={setSecShowTitle} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold">Exibir Subtítulo na Vitrine</Label>
                  <p className="text-3xs text-muted-foreground">
                    Exibe a linha auxiliar abaixo do título se ativo.
                  </p>
                </div>
                <Switch checked={secShowSubtitle} onCheckedChange={setSecShowSubtitle} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold">Seção Ativa</Label>
                  <p className="text-3xs text-muted-foreground">
                    Se desativada, a seção e seus itens não aparecem na Home.
                  </p>
                </div>
                <Switch checked={secIsActive} onCheckedChange={setSecIsActive} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSectionDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveSection}
              disabled={isSaving}
              className="font-bold"
            >
              {isSaving ? "Salvando..." : "Salvar Seção"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog de Edição de Card / Item de Mídia ── */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Card de Mídia" : "Novo Card de Mídia"}
            </DialogTitle>
            <DialogDescription>
              Faça upload direto de mídia para o bucket Supabase Storage com enquadramento adaptativo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Upload de Mídia com MediaUploader Canônico */}
            <BidirectionalMediaUploader
                mobileUrl={itemImageMobileUrl || itemImageUrl}
                desktopUrl={itemImageDesktopUrl || itemImageUrl}
                onMobileChange={(url) => {
                  setItemImageMobileUrl(url);
                  if (!itemImageUrl) setItemImageUrl(url);
                }}
                onDesktopChange={(url) => {
                  setItemImageDesktopUrl(url);
                  if (!itemImageUrl) setItemImageUrl(url);
                }}
                bucket="home-banners"
                folder="home-cms"
                mobileAspect={16 / 9}
                desktopAspect={28 / 9}
              />

            {/* Configurações de Botão / Card Customizado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Cor de Fundo / Estilo (Opcional)</Label>
                <Input
                  value={itemBgColor}
                  onChange={(e) => setItemBgColor(e.target.value)}
                  placeholder="ex: bg-primary/10 ou bg-purple-600"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Rótulo da Minifaixa / Badge</Label>
                <Input
                  value={itemBadgeText}
                  onChange={(e) => setItemBadgeText(e.target.value)}
                  placeholder="ex: Clube, Gourmet, Corridas, NOVO"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Ícone da Minifaixa (Upload de Mídia ou Nome do Ícone) */}
            <div className="space-y-2 p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold">Ícone / Mídia da Minifaixa Inferior (Opcional)</Label>
                  <p className="text-3xs text-muted-foreground">
                    Faça upload do ícone ou digite o nome Phosphor (Ticket, CookingPot, Car, Hamburger).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={itemIconName}
                  onChange={(e) => setItemIconName(e.target.value)}
                  placeholder="URL do ícone ou nome (ex: Ticket, CookingPot, Car)"
                  className="font-mono text-xs flex-1"
                />
                <MediaUploader
                  value={itemIconName.startsWith("http") || itemIconName.startsWith("/") ? [itemIconName] : []}
                  onChange={(urls) => setItemIconName(Array.isArray(urls) ? (urls[0] || "") : String(urls || ""))}
                  maxFiles={1}
                  bucket="home-banners"
                  folder="home-icons"
                  label="Upload Ícone"
                  aspect={1}
                  enableCrop={true}
                />
              </div>
            </div>

            {/* Agendamento Temporal do Item */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="space-y-1">
                <Label className="text-2xs font-semibold">Agendar Início</Label>
                <Input
                  type="datetime-local"
                  value={itemStartsAt}
                  onChange={(e) => setItemStartsAt(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-2xs font-semibold">Expiração Silenciosa</Label>
                <Input
                  type="datetime-local"
                  value={itemEndsAt}
                  onChange={(e) => setItemEndsAt(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Seletor de Destino com DestinationPicker */}
            <div className="space-y-2">
              <DestinationPicker
                value={itemTargetUrl}
                onChange={(url) => setItemTargetUrl(url)}
                label="Destino ao Clicar"
                helperText="Selecione um módulo ou rota para direcionar o usuário."
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold">Exibir Texto Sobreposto</Label>
                  <p className="text-3xs text-muted-foreground">
                    Desative para manter o card 100% limpo com foco apenas na imagem enviada.
                  </p>
                </div>
                <Switch checked={itemShowText} onCheckedChange={setItemShowText} />
              </div>

              {itemShowText && (
                <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Título do Card</Label>
                    <Input
                      value={itemTitle}
                      onChange={(e) => setItemTitle(e.target.value)}
                      placeholder="ex: Gastronomia Local"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Subtítulo do Card</Label>
                    <Input
                      value={itemSubtitle}
                      onChange={(e) => setItemSubtitle(e.target.value)}
                      placeholder="ex: Os melhores lanches e refeições"
                    />
                  </div>
                </div>
              )}

              {/* Spans para Bento Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Colunas no Bento Grid (1 a 4)</Label>
                  <Select
                    value={String(itemSpanX)}
                    onValueChange={(v) => setItemSpanX(Number(v))}
                  >
                    <SelectTrigger className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Coluna (Padrão)</SelectItem>
                      <SelectItem value="2">2 Colunas (Largo)</SelectItem>
                      <SelectItem value="3">3 Colunas (Destaque Médio)</SelectItem>
                      <SelectItem value="4">4 Colunas (Hero Widescreen)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Linhas no Bento Grid (1 a 2)</Label>
                  <Select
                    value={String(itemSpanY)}
                    onValueChange={(v) => setItemSpanY(Number(v))}
                  >
                    <SelectTrigger className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Linha (Altura normal)</SelectItem>
                      <SelectItem value="2">2 Linhas (Dupla altura)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label className="text-xs font-bold">Card Ativo</Label>
                  <p className="text-3xs text-muted-foreground">
                    Se desativado, o card não é renderizado na vitrine.
                  </p>
                </div>
                <Switch checked={itemIsActive} onCheckedChange={setItemIsActive} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsItemDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveItem}
              disabled={isSaving}
              className="font-bold"
            >
              {isSaving ? "Salvando..." : "Salvar Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
