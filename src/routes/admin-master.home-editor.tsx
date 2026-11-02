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
  isHealthyImageUrl,
  type HomePageSectionDTO,
  type HomeSectionItemDTO,
  type HomeLayoutVariant,
  type HomeAspectRatio,
} from "@/services/admin-home-cms.functions";
import { getNavigationMenus, upsertNavigationMenu } from "@/services/cms.functions";
import { openOrCreatePageExperienceDocument } from "@/services/surface-cms.functions";
import { CANONICAL_CITIES } from "@/lib/constants/cities";
import { MetamorphicBannerSlider } from "@/components/home/MetamorphicBannerSlider";
import { NoorNativeCategoryDock } from "@/components/home/NoorNativeCategoryDock";
import { BentoGridTetris } from "@/components/home/BentoGridTetris";
import { IFoodSquareCategoryButton } from "@/components/home/IFoodSquareCategoryButton";

export const Route = createFileRoute("/admin-master/home-editor")({
  head: () => ({ meta: [{ title: "Páginas & Seções | Admin Master" }] }),
  loader: async () => {
    try {
      const [sections, menus] = await Promise.all([
        listAdminHomePageSections().catch(() => []),
        getNavigationMenus().catch(() => []),
      ]);
      return { sections, menus };
    } catch (err) {
      console.error("[loader:admin-master.home-editor] Erro:", err);
      return { sections: [], menus: [] };
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
  { key: "chat_noor_bento", title: "Menu Noor Chat (Tetris Bento Grid)", layout: "bento_grid", aspect: "auto", desc: "Grade modular de 3 linhas do chat (3 botões em cima, 2 embaixo sendo 1 duplo, chamada de mobilidade)" },
  { key: "explore_pillars", title: "Pilares da Página Explorar (4 Cartões)", layout: "cards_action_grid", aspect: "16:9", desc: "Os 4 cartões principais do topo da página Explorar (/explorar)" },
  { key: "explore_categories", title: "Categorias da Página Explorar (Grade 5x2)", layout: "grid_2d", aspect: "1:1", desc: "Atalhos de categorias exibidos na página Explorar (/explorar)" },
  { key: "promo_strip_timer", title: "Faixa com Cronômetro (Black Friday / Ofertas)", layout: "slim_slider", aspect: "auto", desc: "Faixa promocional com contagem regressiva e auto-ocultação" },
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
  { key: "canonical_video_player", title: "Vídeo em Destaque", layout: "slim_slider", aspect: "16:9", desc: "Seção de vídeo widescreen com CTA de conversão" },
  { key: "car_rental_3days_rail", title: "Aluguel de Carros 3 Diárias", layout: "carousel", aspect: "16:9", desc: "Frota de locação com regra de reserva mínima de 3 diárias" },
];

function AdminMasterHomeEditorPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const [sections, setSections] = useState<HomePageSectionDTO[]>(loaderData.sections || []);
  const [menus, setMenus] = useState<any[]>(loaderData.menus || []);
  const [activePageContext, setActivePageContext] = useState<
    "all" | "home" | "explorar" | "chat_noor" | "menus_globais"
  >("all");
  const [selectedMenuHandle, setSelectedMenuHandle] = useState<string>("bottom_nav");
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [isOpeningOmniBuilder, setIsOpeningOmniBuilder] = useState(false);

  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sectionViewMode, setSectionViewMode] = useState<"cards" | "sheet">("cards");


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
  const [secCityFilter, setSecCityFilter] = useState("all");
  const [secStartsAt, setSecStartsAt] = useState("");
  const [secEndsAt, setSecEndsAt] = useState("");
  const [secAutoArchiveAt, setSecAutoArchiveAt] = useState("");

  // Estados de edição de Item
  const [selectedSectionForNewItem, setSelectedSectionForNewItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<HomeSectionItemDTO | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [itemSubtitle, setItemSubtitle] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [itemImageDesktopUrl, setItemImageDesktopUrl] = useState("");
  const [itemImageMobileUrl, setItemImageMobileUrl] = useState("");
  const [itemBgColor, setItemBgColor] = useState("");
  const [itemTextColor, setItemTextColor] = useState("");
  const [itemButtonShape, setItemButtonShape] = useState("squircle");
  const [itemGradient, setItemGradient] = useState("");
  const [itemShadowMode, setItemShadowMode] = useState("none");
  const [itemCityFilter, setItemCityFilter] = useState("all");
  const [itemIconName, setItemIconName] = useState("");
  const [itemTargetUrl, setItemTargetUrl] = useState("/");
  const [itemShowText, setItemShowText] = useState(false);
  const [itemBadgeText, setItemBadgeText] = useState("");
  const [itemSpanX, setItemSpanX] = useState(1);
  const [itemSpanY, setItemSpanY] = useState(1);
  const [itemStartsAt, setItemStartsAt] = useState("");
  const [itemEndsAt, setItemEndsAt] = useState("");
  const [itemAutoArchiveAt, setItemAutoArchiveAt] = useState("");
  const [itemIsActive, setItemIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const refreshSections = async () => {
    try {
      const [data, navData] = await Promise.all([
        listAdminHomePageSections(),
        getNavigationMenus().catch(() => []),
      ]);
      setSections(data || []);
      if (navData && navData.length > 0) setMenus(navData);
    } catch (e: any) {
      toast.error("Erro ao sincronizar seções: " + e.message);
    }
  };

  const activeMenuObj = menus.find((m) => m.handle === selectedMenuHandle) || {
    handle: selectedMenuHandle,
    name:
      selectedMenuHandle === "bottom_nav"
        ? "Menu Mobile Inferior (5 Abas Principais)"
        : selectedMenuHandle === "header_nav"
          ? "Menu Cabeçalho Global (Topo)"
          : "Menu de Atalhos da Página Explorar",
    items: [],
  };

  const updateActiveMenuItems = (newItems: any[]) => {
    setMenus((prev) => {
      const exists = prev.some((m) => m.handle === selectedMenuHandle);
      if (exists) {
        return prev.map((m) => (m.handle === selectedMenuHandle ? { ...m, items: newItems } : m));
      }
      return [...prev, { ...activeMenuObj, items: newItems }];
    });
  };

  const handleSaveActiveMenu = async () => {
    setIsSavingMenu(true);
    try {
      await upsertNavigationMenu({
        data: {
          id: activeMenuObj.id,
          handle: activeMenuObj.handle,
          name: activeMenuObj.name || activeMenuObj.handle,
          items: activeMenuObj.items || [],
        },
      });
      toast.success(`Menu "${activeMenuObj.name}" salvo e publicado!`);
      await refreshSections();
    } catch (e: any) {
      toast.error("Falha ao salvar menu: " + e.message);
    } finally {
      setIsSavingMenu(false);
    }
  };

  const handleOpenOmniBuilderForPage = async (pageSlug: string, pageTitle: string) => {
    setIsOpeningOmniBuilder(true);
    try {
      const res = await openOrCreatePageExperienceDocument({
        data: { pageSlug, pageTitle },
      });
      window.location.href = `/workspace/builder/${res.documentId}/editor`;
    } catch (e: any) {
      toast.error(e.message || "Falha ao abrir Omni Builder.");
    } finally {
      setIsOpeningOmniBuilder(false);
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
    setSecCityFilter("all");
    setSecStartsAt("");
    setSecEndsAt("");
    setSecAutoArchiveAt("");
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
    setSecCityFilter(sec.city_filter || "all");
    setSecStartsAt(sec.starts_at ? sec.starts_at.slice(0, 16) : "");
    setSecEndsAt(sec.ends_at ? sec.ends_at.slice(0, 16) : "");
    setSecAutoArchiveAt(sec.auto_archive_at ? sec.auto_archive_at.slice(0, 16) : "");
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
          city_filter: secCityFilter === "all" ? null : secCityFilter,
          starts_at: secStartsAt ? new Date(secStartsAt).toISOString() : null,
          ends_at: secEndsAt ? new Date(secEndsAt).toISOString() : null,
          auto_archive_at: secAutoArchiveAt ? new Date(secAutoArchiveAt).toISOString() : null,
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
    setItemTextColor("");
    setItemButtonShape("squircle");
    setItemGradient("");
    setItemShadowMode("none");
    setItemCityFilter("all");
    setItemIconName("");
    setItemTargetUrl("/");
    setItemShowText(true);
    setItemBadgeText("");
    setItemSpanX(1);
    setItemSpanY(1);
    setItemStartsAt("");
    setItemEndsAt("");
    setItemAutoArchiveAt("");
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
    setItemTextColor(item.text_color || "");
    setItemButtonShape(item.button_shape || "squircle");
    setItemGradient(item.metadata?.gradient || "");
    setItemShadowMode(item.metadata?.shadow_mode || "none");
    setItemCityFilter(item.city_filter || "all");
    setItemIconName(item.icon_name || "");
    setItemTargetUrl(item.target_url);
    setItemShowText(item.show_text);
    setItemBadgeText(item.badge_text || "");
    setItemSpanX(item.grid_span_x || 1);
    setItemSpanY(item.grid_span_y || 1);
    setItemStartsAt(item.starts_at ? item.starts_at.slice(0, 16) : "");
    setItemEndsAt(item.ends_at ? item.ends_at.slice(0, 16) : "");
    setItemAutoArchiveAt(item.auto_archive_at ? item.auto_archive_at.slice(0, 16) : "");
    setItemIsActive(item.is_active);
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async () => {
    if (!selectedSectionForNewItem) return;
    const resolvedImg = itemImageUrl.trim() || itemImageDesktopUrl.trim() || itemImageMobileUrl.trim();
    if (!resolvedImg && !itemTitle.trim() && !itemIconName.trim()) {
      toast.error("Informe pelo menos um título, ícone ou imagem para o card/botão.");
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
          image_url: resolvedImg || "",
          image_desktop_url: itemImageDesktopUrl.trim() || null,
          image_mobile_url: itemImageMobileUrl.trim() || null,
          bg_color: itemBgColor.trim() || null,
          text_color: itemTextColor.trim() || null,
          button_shape: itemButtonShape || "squircle",
          city_filter: itemCityFilter === "all" ? null : itemCityFilter,
          icon_name: itemIconName.trim() || null,
          starts_at: itemStartsAt ? new Date(itemStartsAt).toISOString() : null,
          ends_at: itemEndsAt ? new Date(itemEndsAt).toISOString() : null,
          auto_archive_at: itemAutoArchiveAt ? new Date(itemAutoArchiveAt).toISOString() : null,
          metadata: {
            ...(editingItem?.metadata || {}),
            gradient: itemGradient.trim() || null,
            shadow_mode: itemShadowMode === "none" ? null : itemShadowMode,
            timer_expires_at: itemEndsAt ? new Date(itemEndsAt).toISOString() : null,
          },
          target_url: itemTargetUrl.trim() || "/",
          show_text: itemShowText,
          grid_span_x: itemSpanX,
          grid_span_y: itemSpanY,
          badge_text: itemBadgeText.trim() || null,
          is_active: itemIsActive,
          sort_order: editingItem?.sort_order ?? currentItemsCount,
        },
      });
      toast.success(editingItem ? "Card/Botão atualizado!" : "Novo card/botão cadastrado!");
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
    if (activePageContext === "chat_noor") {
      if (s.section_key !== "chat_noor_bento" && s.metadata?.page !== "chat_noor") return false;
    } else if (activePageContext === "explorar") {
      if (
        s.section_key !== "explore_pillars" &&
        s.section_key !== "explore_categories" &&
        s.metadata?.page !== "explorar"
      ) {
        return false;
      }
    } else if (activePageContext === "home") {
      if (
        s.section_key === "chat_noor_bento" ||
        s.section_key === "explore_pillars" ||
        s.section_key === "explore_categories"
      ) {
        return false;
      }
    }
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Páginas & Seções da Plataforma
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Gerencie os blocos, trilhos e menus do portal ou personalize o layout visual no Omni Builder.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={isOpeningOmniBuilder}
            onClick={() =>
              handleOpenOmniBuilderForPage(
                activePageContext === "explorar"
                  ? "explorar"
                  : activePageContext === "chat_noor"
                    ? "chat_noor"
                    : "home",
                activePageContext === "explorar"
                  ? "Página Explorar"
                  : activePageContext === "chat_noor"
                    ? "Página Chat Noor"
                    : "Página Início",
              )
            }
            className="gap-2 h-11 min-h-11 font-semibold"
          >
            <Sparkles size={16} />
            <span>{isOpeningOmniBuilder ? "Abrindo..." : "Editar no Omni Builder"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openNewSectionDialog}
            className="gap-2 h-11 min-h-11 font-medium"
          >
            <Plus size={16} />
            <span>Nova Seção</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="gap-2 h-11 min-h-11 text-muted-foreground hover:text-foreground"
          >
            <Eye size={16} />
            <span>{showLivePreview ? "Ocultar Preview" : "Preview"}</span>
          </Button>
        </div>
      </div>

      {/* ── Seletor Estruturado Página por Página + Subeditores Rápidos ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 scroll-area-carousel pb-1">
          <button
            type="button"
            onClick={() => setActivePageContext("all")}
            className={`h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activePageContext === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <Layout size={14} />
            <span>Todas as Seções ({sections.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePageContext("home")}
            className={`h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activePageContext === "home"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <span>Página Início (Home)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivePageContext("explorar");
              setSelectedMenuHandle("explore_menu");
            }}
            className={`h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activePageContext === "explorar"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <span>Página Explorar (/explorar)</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePageContext("chat_noor")}
            className={`h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activePageContext === "chat_noor"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <span>Página Chat Noor (/chat)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivePageContext("menus_globais");
              setSelectedMenuHandle("bottom_nav");
            }}
            className={`h-11 min-h-11 sm:h-9 px-3 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activePageContext === "menus_globais"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <Grid size={14} />
            <span>Menus Mobile (5 Abas) & Header</span>
          </button>

          
          
        </div>
      </div>

      {/* ── SUB-EDITOR INTERATIVO DE MENUS MOBILE & CABEÇALHO (bottom_nav, header_nav, explore_menu) ── */}
      {(activePageContext === "menus_globais" || activePageContext === "explorar") && (
        <div className="p-4 sm:p-5 rounded-lg border border-border/80 bg-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Editor de Menus Mobile & Navegação Global
              </h2>
              <p className="text-xs text-muted-foreground">
                Personalize ícones (upload via bucket ou nome), rótulos, badges, cores, links e agendamento das abas.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(
                [
                  { handle: "bottom_nav", label: "Menu Mobile Inferior (5 Abas)" },
                  { handle: "header_nav", label: "Menu Cabeçalho Global" },
                  { handle: "explore_menu", label: "Menu Rápido Explorar" },
                ] as const
              ).map((mTab) => (
                <button
                  key={mTab.handle}
                  type="button"
                  onClick={() => setSelectedMenuHandle(mTab.handle)}
                  className={`h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    selectedMenuHandle === mTab.handle
                      ? "bg-primary text-primary-foreground font-bold"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mTab.label}
                </button>
              ))}

              <Button
                type="button"
                size="sm"
                disabled={isSavingMenu}
                onClick={handleSaveActiveMenu}
                className="h-11 min-h-11 font-bold"
              >
                {isSavingMenu ? "Salvando Menu..." : "Salvar Menu"}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {(activeMenuObj.items || []).map((navItem: any, nIdx: number) => (
              <div
                key={navItem.id || nIdx}
                className="p-3 rounded-lg border border-border/60 bg-muted/20 grid grid-cols-1 md:grid-cols-6 gap-2 items-center"
              >
                <Input
                  value={navItem.label || ""}
                  onChange={(e) => {
                    const next = [...(activeMenuObj.items || [])];
                    next[nIdx] = { ...next[nIdx], label: e.target.value };
                    updateActiveMenuItems(next);
                  }}
                  placeholder="Rótulo (ex: Explorar)"
                  className="h-9 text-xs font-semibold"
                />
                <Input
                  value={navItem.url || ""}
                  onChange={(e) => {
                    const next = [...(activeMenuObj.items || [])];
                    next[nIdx] = { ...next[nIdx], url: e.target.value };
                    updateActiveMenuItems(next);
                  }}
                  placeholder="Rota (ex: /explorar)"
                  className="h-9 text-xs font-mono"
                />
                <Input
                  value={navItem.icon || ""}
                  onChange={(e) => {
                    const next = [...(activeMenuObj.items || [])];
                    next[nIdx] = { ...next[nIdx], icon: e.target.value };
                    updateActiveMenuItems(next);
                  }}
                  placeholder="Ícone (ex: Compass, MessageCircle)"
                  className="h-9 text-xs font-mono"
                />
                <Input
                  value={navItem.image_url || ""}
                  onChange={(e) => {
                    const next = [...(activeMenuObj.items || [])];
                    next[nIdx] = { ...next[nIdx], image_url: e.target.value };
                    updateActiveMenuItems(next);
                  }}
                  placeholder="URL Ícone Upload (opcional)"
                  className="h-9 text-xs font-mono"
                />
                <Input
                  value={navItem.badge_text || ""}
                  onChange={(e) => {
                    const next = [...(activeMenuObj.items || [])];
                    next[nIdx] = { ...next[nIdx], badge_text: e.target.value };
                    updateActiveMenuItems(next);
                  }}
                  placeholder="Badge (ex: IA, NOVO)"
                  className="h-9 text-xs"
                />
                <div className="flex items-center justify-between gap-2">
                  <MediaUploader
                    value={navItem.image_url ? [navItem.image_url] : []}
                    onChange={(urls) => {
                      const next = [...(activeMenuObj.items || [])];
                      next[nIdx] = {
                        ...next[nIdx],
                        image_url: Array.isArray(urls) ? urls[0] || "" : String(urls || ""),
                      };
                      updateActiveMenuItems(next);
                    }}
                    maxFiles={1}
                    bucket="home-banners"
                    folder="menu-icons"
                    label="Ícone"
                    aspect={1}
                    enableCrop={true}
                  />
                  <Switch
                    checked={navItem.is_active !== false}
                    onCheckedChange={(checked) => {
                      const next = [...(activeMenuObj.items || [])];
                      next[nIdx] = { ...next[nIdx], is_active: checked };
                      updateActiveMenuItems(next);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = (activeMenuObj.items || []).filter((_: any, i: number) => i !== nIdx);
                      updateActiveMenuItems(next);
                    }}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title="Remover item do menu"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = [
                    ...(activeMenuObj.items || []),
                    {
                      id: `nav-${Date.now()}`,
                      label: "Novo Item",
                      url: "/",
                      icon: "Compass",
                      image_url: "",
                      badge_text: "",
                      is_active: true,
                    },
                  ];
                  updateActiveMenuItems(next);
                }}
                className="h-11 min-h-11 text-xs font-bold"
              >
                + Adicionar Item ao Menu
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSavingMenu}
                onClick={handleSaveActiveMenu}
                className="h-11 min-h-11 text-xs font-bold"
              >
                {isSavingMenu ? "Salvando..." : "Salvar Alterações do Menu"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
              <div className="text-xs font-bold text-muted-foreground mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>Cards de Mídia ({section.items?.length || 0})</span>
                  <span className="text-3xs font-normal">
                    {section.items?.every((i) => !i.show_text)
                      ? "Modo Mídia Pura (sem textos excessivos)"
                      : "Misto (alguns cards exibem texto)"}
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
                  <button
                    type="button"
                    onClick={() => setSectionViewMode("cards")}
                    className={`h-11 min-h-11 px-3 rounded-md text-2xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      sectionViewMode === "cards"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Grade de Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setSectionViewMode("sheet")}
                    className={`h-11 min-h-11 px-3 rounded-md text-2xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      sectionViewMode === "sheet"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Modo Planilha (Sheet Editável)
                  </button>
                </div>
              </div>

              {(!section.items || section.items.length === 0) ? (
                <div className="p-6 rounded-lg border border-dashed border-border/60 text-center space-y-2">
                  <ImageIcon size={24} className="mx-auto text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    Nenhum card cadastrado nesta seção. Clique em "Novo Card" para fazer upload de mídia.
                  </p>
                </div>
              ) : sectionViewMode === "sheet" ? (
                <div className="rounded-xl border border-border/60 bg-background scroll-area-carousel">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/60 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-3 w-10">#</th>
                        <th className="py-3 px-3 min-w-44">Mídia / Upload</th>
                        <th className="py-3 px-3 min-w-44">Título & Subtítulo</th>
                        <th className="py-3 px-3 min-w-24 text-center">Texto</th>
                        <th className="py-3 px-3 min-w-40">Ícone / Upload</th>
                        <th className="py-3 px-3 min-w-36">Cores & Badge</th>
                        <th className="py-3 px-3 min-w-40">Rota & Cidade</th>
                        <th className="py-3 px-3 min-w-36">Prazo / Timer</th>
                        <th className="py-3 px-3 w-28 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-xs">
                      {section.items.map((item, itIdx) => {
                        const updateLocalItem = (patch: Partial<HomeSectionItemDTO>) => {
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === section.id
                                ? {
                                    ...s,
                                    items: s.items.map((it) =>
                                      it.id === item.id ? { ...it, ...patch } : it,
                                    ),
                                  }
                                : s,
                            ),
                          );
                        };
                        const saveInlineRow = async () => {
                          try {
                            await upsertHomeSectionItem({
                              data: {
                                id: item.id,
                                section_id: section.id,
                                title: item.title || null,
                                subtitle: item.subtitle || null,
                                image_url: item.image_url || item.image_desktop_url || item.image_mobile_url || "",
                                image_desktop_url: item.image_desktop_url || null,
                                image_mobile_url: item.image_mobile_url || null,
                                bg_color: item.bg_color || null,
                                text_color: item.text_color || null,
                                button_shape: item.button_shape || "squircle",
                                city_filter: !item.city_filter || item.city_filter === "all" ? null : item.city_filter,
                                icon_name: item.icon_name || null,
                                starts_at: item.starts_at || null,
                                ends_at: item.ends_at || null,
                                auto_archive_at: item.auto_archive_at || null,
                                metadata: item.metadata || {},
                                target_url: item.target_url || "/",
                                show_text: item.show_text,
                                grid_span_x: item.grid_span_x || 1,
                                grid_span_y: item.grid_span_y || 1,
                                badge_text: item.badge_text || null,
                                is_active: item.is_active,
                                sort_order: item.sort_order ?? itIdx,
                              },
                            });
                            toast.success(`Linha #${itIdx + 1} salva!`);
                            await refreshSections();
                          } catch (err: any) {
                            toast.error("Erro ao salvar linha: " + err.message);
                          }
                        };
                        return (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors align-top">
                            <td className="py-3 px-3 font-mono text-2xs text-muted-foreground font-bold">
                              {itIdx + 1}
                            </td>
                            <td className="py-3 px-3 space-y-2">
                              <div className="flex items-center gap-2">
                                {isHealthyImageUrl(item.image_url || item.image_desktop_url || item.image_mobile_url) ? (
                                  <img
                                    src={(item.image_url || item.image_desktop_url || item.image_mobile_url) || undefined}
                                    alt={item.title || ""}
                                    className="size-10 rounded-lg object-cover border border-border/60 shrink-0"
                                  />
                                ) : (
                                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center border border-border/60 shrink-0 text-3xs font-mono text-muted-foreground">
                                    IMG
                                  </div>
                                )}
                                <MediaUploader
                                  value={item.image_url ? [item.image_url] : []}
                                  onChange={(urls) => {
                                    const next = Array.isArray(urls) ? urls[0] || "" : String(urls || "");
                                    updateLocalItem({ image_url: next, image_mobile_url: next });
                                  }}
                                  maxFiles={1}
                                  bucket="home-banners"
                                  folder="home-cms"
                                  label="Upload"
                                />
                              </div>
                            </td>
                            <td className="py-3 px-3 space-y-2">
                              <Input
                                value={item.title || ""}
                                onChange={(e) => updateLocalItem({ title: e.target.value })}
                                placeholder="Título"
                                className="h-9 text-xs font-semibold"
                              />
                              <Input
                                value={item.subtitle || ""}
                                onChange={(e) => updateLocalItem({ subtitle: e.target.value })}
                                placeholder="Subtítulo"
                                className="h-9 text-2xs"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <Switch
                                checked={Boolean(item.show_text)}
                                onCheckedChange={(val) => updateLocalItem({ show_text: val })}
                              />
                            </td>
                            <td className="py-3 px-3 space-y-2">
                              <Input
                                value={item.icon_name || ""}
                                onChange={(e) => updateLocalItem({ icon_name: e.target.value })}
                                placeholder="Ícone ou URL"
                                className="h-9 text-2xs font-mono"
                              />
                              <MediaUploader
                                value={item.icon_name && (item.icon_name.startsWith("http") || item.icon_name.startsWith("/")) ? [item.icon_name] : []}
                                onChange={(urls) => {
                                  const next = Array.isArray(urls) ? urls[0] || "" : String(urls || "");
                                  updateLocalItem({ icon_name: next });
                                }}
                                maxFiles={1}
                                bucket="home-banners"
                                folder="home-icons"
                                label="Upload Ícone"
                              />
                            </td>
                            <td className="py-3 px-3 space-y-2">
                              <Input
                                value={item.badge_text || ""}
                                onChange={(e) => updateLocalItem({ badge_text: e.target.value })}
                                placeholder="Badge (ex: NOVO)"
                                className="h-9 text-2xs"
                              />
                              <div className="grid grid-cols-2 gap-1">
                                <Input
                                  value={item.bg_color || ""}
                                  onChange={(e) => updateLocalItem({ bg_color: e.target.value })}
                                  placeholder="Fundo"
                                  className="h-9 text-2xs font-mono"
                                />
                                <Input
                                  value={item.text_color || ""}
                                  onChange={(e) => updateLocalItem({ text_color: e.target.value })}
                                  placeholder="Texto"
                                  className="h-9 text-2xs font-mono"
                                />
                              </div>
                            </td>
                            <td className="py-3 px-3 space-y-2">
                              <Input
                                value={item.target_url || "/"}
                                onChange={(e) => updateLocalItem({ target_url: e.target.value })}
                                placeholder="/rota"
                                className="h-9 text-2xs font-mono"
                              />
                              <Input
                                value={item.city_filter || ""}
                                onChange={(e) => updateLocalItem({ city_filter: e.target.value })}
                                placeholder="Cidade (vazio=todas)"
                                className="h-9 text-2xs"
                              />
                            </td>
                            <td className="py-3 px-3 space-y-2">
                              <Input
                                type="datetime-local"
                                value={item.ends_at ? item.ends_at.slice(0, 16) : ""}
                                onChange={(e) =>
                                  updateLocalItem({
                                    ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                                  })
                                }
                                className="h-9 text-2xs"
                              />
                            </td>
                            <td className="py-3 px-3 text-right space-y-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={saveInlineRow}
                                className="h-11 min-h-11 w-full text-2xs font-bold"
                              >
                                Salvar
                              </Button>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditItemDialog(section.id, item)}
                                  className="p-2 text-primary hover:bg-primary/10 rounded focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-ring"
                                  title="Abrir modal completo"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-2 text-destructive hover:bg-destructive/10 rounded focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-ring"
                                  title="Excluir"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {section.items.map((item, itIdx) => (
                    <div
                      key={item.id}
                      className="group relative rounded-lg border border-border/60 bg-muted/20 overflow-hidden flex flex-col justify-between"
                    >
                      <div
                        style={{
                          ...(item.bg_color ? { backgroundColor: item.bg_color } : {}),
                          ...(item.metadata?.gradient ? { backgroundImage: item.metadata.gradient } : {}),
                        }}
                        className="relative aspect-video w-full bg-muted/50 overflow-hidden flex items-center justify-center"
                      >
                        {isHealthyImageUrl(item.image_url || item.image_desktop_url || item.image_mobile_url) ? (
                          <img
                            src={(item.image_url || item.image_desktop_url || item.image_mobile_url) || undefined}
                            alt={item.title || ""}
                            className="size-full object-cover"
                          />
                        ) : isHealthyImageUrl(item.icon_name) ? (
                          <img
                            src={item.icon_name!}
                            alt={item.title || ""}
                            className="size-12 object-contain"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 p-2 text-center">
                            <span className="text-2xs font-mono font-bold text-primary">
                              {item.icon_name ? `Ícone: ${item.icon_name}` : "Botão / Card"}
                            </span>
                          </div>
                        )}
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
        <DialogContent className="sm:max-w-5xl w-full max-h-sheet overflow-y-auto">
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

            <div className="space-y-2">
              <Label className="text-xs font-bold">Localidade / Cidade Alvo</Label>
              <Select value={secCityFilter} onValueChange={setSecCityFilter}>
                <SelectTrigger className="min-h-11 text-xs">
                  <SelectValue placeholder="Todas as Cidades (Global)" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">Todas as Cidades (Global)</SelectItem>
                  {CANONICAL_CITIES.map((c) => (
                    <SelectItem key={c.id} value={c.name} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="space-y-1">
                <Label className="text-2xs font-semibold">Agendar Início</Label>
                <Input
                  type="datetime-local"
                  value={secStartsAt}
                  onChange={(e) => setSecStartsAt(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-2xs font-semibold">Prazo Final (Fim)</Label>
                <Input
                  type="datetime-local"
                  value={secEndsAt}
                  onChange={(e) => setSecEndsAt(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-2xs font-semibold">Auto-Arquivar em</Label>
                <Input
                  type="datetime-local"
                  value={secAutoArchiveAt}
                  onChange={(e) => setSecAutoArchiveAt(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
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
        <DialogContent className="sm:max-w-5xl w-full">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar Card de Mídia" : "Novo Card de Mídia"}
            </DialogTitle>
            <DialogDescription>
              Faça upload direto de mídia para o bucket Supabase Storage com enquadramento adaptativo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-sheet overflow-y-auto pr-1">
            {/* Rótulo e Subtítulo Sempre Visíveis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Título do Botão / Card</Label>
                <Input
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="ex: Restaurantes, Marketplace, Corridas"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Subtítulo / Descrição Curta</Label>
                <Input
                  value={itemSubtitle}
                  onChange={(e) => setItemSubtitle(e.target.value)}
                  placeholder="ex: Entrega rápida na sua cidade"
                  className="text-xs"
                />
              </div>
            </div>

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

            {/* Configurações Visuais: Cor de Fundo, Cor do Texto, Badge, Formato, Gradiente e Sombra */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Cor de Fundo (Hex/Token)</Label>
                <Input
                  value={itemBgColor}
                  onChange={(e) => setItemBgColor(e.target.value)}
                  placeholder="Token ou cor (ex: bg-primary)"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Cor do Texto / Ícone</Label>
                <Input
                  value={itemTextColor}
                  onChange={(e) => setItemTextColor(e.target.value)}
                  placeholder="Token ou cor (ex: text-primary-foreground)"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Rótulo de Badge</Label>
                <Input
                  value={itemBadgeText}
                  onChange={(e) => setItemBadgeText(e.target.value)}
                  placeholder="ex: NOVO, R$ 0,99, HOT"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Formato do Botão</Label>
                <Select value={itemButtonShape} onValueChange={setItemButtonShape}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="squircle">Squircle Apple/iFood (Padrão)</SelectItem>
                    <SelectItem value="rounded-lg">Retangular Suave (rounded-lg)</SelectItem>
                    <SelectItem value="rounded-full">Pílula / Circular (rounded-full)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Gradiente CSS (Opcional)</Label>
                <Input
                  value={itemGradient}
                  onChange={(e) => setItemGradient(e.target.value)}
                  placeholder="linear-gradient(135deg, ...)"
                  className="font-mono text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Elevação / Sombra</Label>
                <Select value={itemShadowMode} onValueChange={setItemShadowMode}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem Sombra (Flat Clean)</SelectItem>
                    <SelectItem value="md">Sombra Média (Destaque)</SelectItem>
                    <SelectItem value="lg">Sombra Profunda (Flutuante)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ícone da Minifaixa (Upload de Mídia ou Nome do Ícone) */}
            <div className="space-y-2 p-3 rounded-lg bg-muted/20 border border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold">Ícone do Botão / Card (Upload ou Nome)</Label>
                  <p className="text-3xs text-muted-foreground">
                    Faça upload do ícone via bucket ou informe o nome (Hamburger, Storefront, Pill, Car, Tag, Compass, Ticket).
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

            {/* Localidade / Cidade Alvo do Item */}
            <div className="space-y-1">
              <Label className="text-xs font-bold">Localidade / Cidade Alvo deste Card</Label>
              <Select value={itemCityFilter} onValueChange={setItemCityFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas as Cidades (Global)" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">Todas as Cidades (Global)</SelectItem>
                  {CANONICAL_CITIES.map((c) => (
                    <SelectItem key={c.id} value={c.name} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agendamento Temporal, Expiração & Cronômetro */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/20 border border-border/40">
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
                <Label className="text-2xs font-semibold">Prazo / Timer Regressivo</Label>
                <Input
                  type="datetime-local"
                  value={itemEndsAt}
                  onChange={(e) => setItemEndsAt(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-2xs font-semibold">Auto-Ocultar em</Label>
                <Input
                  type="datetime-local"
                  value={itemAutoArchiveAt}
                  onChange={(e) => setItemAutoArchiveAt(e.target.value)}
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
                  <Label className="text-xs font-bold">Exibir Rótulo de Texto na Vitrine</Label>
                  <p className="text-3xs text-muted-foreground">
                    Desative se a imagem enviada já possuir texto próprio embutido.
                  </p>
                </div>
                <Switch checked={itemShowText} onCheckedChange={setItemShowText} />
              </div>

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
