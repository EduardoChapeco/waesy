/**
 * OmniEditor.tsx — Editor Visual Bifurcado (Software UI Desktop vs WhatsApp List Mobile)
 * Padrão Wix-Level Builder & Figma / Webflow ergonomics.
 */

import React, { useState } from "react";
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
import { NICHE_TEMPLATE_MATRIX, applyTemplateToPage, NicheTemplateDefinition } from "./templates";
import { LiveTemplatePreviewModal } from "./LiveTemplatePreviewModal";

import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Settings2,
  Sliders,
  Smartphone,
  Monitor,
  Eye,
  Check,
  Palette,
  LayoutTemplate,
  Layers,
  Sparkles,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

import { MediaUploader } from "@/components/admin/builder/MediaUploader";

export type { WixBlockCategory } from "./registry";


const BLOCK_ICONS: Record<string, any> = {
  hero_minimal_split: LayoutTemplate,
  hero_interactive_carousel: Sparkles,
  bento_asymmetric_4: Layers,
  media_gallery_mosaic: Image,
  pricing_three_tiers: Tag,
  testimonials_social_proof: MessageSquare,
  contact_form_direct: Mail,
  faq_clean_accordion: HelpCircle,
};

interface BlockContentFieldsProps {
  selectedBlock: OmniBlockInstance;
  onUpdateConfig: (key: string, value: any) => void;
}

export const BlockContentFields: React.FC<BlockContentFieldsProps> = ({
  selectedBlock,
  onUpdateConfig,
}) => {
  const config = selectedBlock.config as any;

  return (
    <div className="space-y-4">
      {/* 1. Título Padrão */}
      {config.title !== undefined && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Título da Seção
          </label>
          <Input
            value={config.title || ""}
            onChange={(e) => onUpdateConfig("title", e.target.value)}
            className="h-9 rounded-lg text-xs"
          />
        </div>
      )}

      {/* 2. Subtítulo / Descrição */}
      {config.subtitle !== undefined && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Subtítulo / Descrição
          </label>
          <Textarea
            value={config.subtitle || ""}
            onChange={(e) => onUpdateConfig("subtitle", e.target.value)}
            rows={3}
            className="rounded-lg text-xs resize-none"
          />
        </div>
      )}

      {/* 3. Badge Superior */}
      {config.badgeText !== undefined && (
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Pílula Superior (Badge)
          </label>
          <Input
            value={config.badgeText || ""}
            onChange={(e) => onUpdateConfig("badgeText", e.target.value)}
            className="h-9 rounded-lg text-xs"
          />
        </div>
      )}

      {/* 4. Imagem Principal Simples (Upload Real para Storage - Zero Mocks) */}
      {config.imageUrl !== undefined && (
        <div className="pt-2 border-t border-border/40 space-y-1.5">
          <label className="block text-xs font-semibold text-foreground">
            Imagem Principal (Upload Real para Storage)
          </label>
          <MediaUploader
            value={config.imageUrl || ""}
            onChange={(url) => onUpdateConfig("imageUrl", url)}
            bucket="store-assets"
            folder="builder"
            label="Imagem de Destaque"
          />
        </div>
      )}

      {/* 5. Galeria de Mídia Mosaico (Uploads Reais E2E) */}
      {selectedBlock.type === "media_gallery_mosaic" && (
        <div className="pt-2 border-t border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Fotos da Galeria</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const current = config.items || [];
                const newItem = {
                  id: `g-${Date.now()}`,
                  imageUrl: "",
                  title: "Nova Foto",
                  caption: "",
                };
                onUpdateConfig("items", [...current, newItem]);
              }}
              className="h-7 text-xs px-2 rounded-lg gap-1 cursor-pointer"
            >
              <Plus className="size-3" />
              Adicionar Foto
            </Button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {(config.items || []).map((item: any, idx: number) => (
              <div key={item.id || idx} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Foto #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = config.items || [];
                      onUpdateConfig(
                        "items",
                        current.filter((_: any, i: number) => i !== idx)
                      );
                    }}
                    className="text-destructive hover:underline text-xs cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
                <MediaUploader
                  value={item.imageUrl || ""}
                  onChange={(url) => {
                    const current = [...(config.items || [])];
                    current[idx] = { ...current[idx], imageUrl: url };
                    onUpdateConfig("items", current);
                  }}
                  bucket="store-assets"
                  folder="builder"
                  label="Mídia da Galeria"
                />
                <Input
                  value={item.title || ""}
                  onChange={(e) => {
                    const current = [...(config.items || [])];
                    current[idx] = { ...current[idx], title: e.target.value };
                    onUpdateConfig("items", current);
                  }}
                  placeholder="Título da foto"
                  className="h-8 text-xs"
                />
                <Input
                  value={item.caption || ""}
                  onChange={(e) => {
                    const current = [...(config.items || [])];
                    current[idx] = { ...current[idx], caption: e.target.value };
                    onUpdateConfig("items", current);
                  }}
                  placeholder="Legenda da foto"
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Carrossel de Destaques (Slides com Upload Real) */}
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
                  ctaText: "Ver Mais",
                  ctaHref: "#",
                };
                onUpdateConfig("slides", [...current, newSlide]);
              }}
              className="h-7 text-xs px-2 rounded-lg gap-1 cursor-pointer"
            >
              <Plus className="size-3" />
              Adicionar Slide
            </Button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {(config.slides || []).map((slide: any, idx: number) => (
              <div key={slide.id || idx} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Slide #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = config.slides || [];
                      onUpdateConfig(
                        "slides",
                        current.filter((_: any, i: number) => i !== idx)
                      );
                    }}
                    className="text-destructive hover:underline text-xs cursor-pointer"
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
                  bucket="store-assets"
                  folder="builder"
                  label="Imagem do Slide"
                />
                <Input
                  value={slide.title || ""}
                  onChange={(e) => {
                    const current = [...(config.slides || [])];
                    current[idx] = { ...current[idx], title: e.target.value };
                    onUpdateConfig("slides", current);
                  }}
                  placeholder="Título do Slide"
                  className="h-8 text-xs"
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
                  rating: 5,
                  comment: "Excelente experiência e atendimento pontual.",
                  verified: true,
                };
                onUpdateConfig("testimonials", [...current, newT]);
              }}
              className="h-7 text-xs px-2 rounded-lg gap-1 cursor-pointer"
            >
              <Plus className="size-3" />
              Adicionar
            </Button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {(config.testimonials || []).map((t: any, idx: number) => (
              <div key={t.id || idx} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Depoimento #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = config.testimonials || [];
                      onUpdateConfig(
                        "testimonials",
                        current.filter((_: any, i: number) => i !== idx)
                      );
                    }}
                    className="text-destructive hover:underline text-xs cursor-pointer"
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
                  bucket="store-assets"
                  folder="builder"
                  aspect={1}
                  cropShape="round"
                  label="Foto do Cliente"
                />
                <Input
                  value={t.name || ""}
                  onChange={(e) => {
                    const current = [...(config.testimonials || [])];
                    current[idx] = { ...current[idx], name: e.target.value };
                    onUpdateConfig("testimonials", current);
                  }}
                  placeholder="Nome do Cliente"
                  className="h-8 text-xs"
                />
                <Input
                  value={t.role || ""}
                  onChange={(e) => {
                    const current = [...(config.testimonials || [])];
                    current[idx] = { ...current[idx], role: e.target.value };
                    onUpdateConfig("testimonials", current);
                  }}
                  placeholder="Cargo ou Cidade"
                  className="h-8 text-xs"
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
            className="h-9 rounded-lg text-xs"
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
            className="h-9 rounded-lg text-xs"
          />
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
}

export const OmniEditor: React.FC<OmniEditorProps> = ({
  initialDocument,
  onSave,
  onPublish,
  onBack,
}) => {
  const [document, setDocument] = useState<OmniPageDocument>(initialDocument);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initialDocument.title);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    document.blocks[0]?.id || null
  );
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

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
  const [inspectorTab, setInspectorTab] = useState<"content" | "styling">("content");

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

  // ── MANIPULADORES DE ESTADO IMUTÁVEL ──

  const handleAddBlock = (blockType: string) => {
    const def = getSiteBlockById(blockType);
    const updated = addBlockToPage(document, blockType, def.defaultProps, def.defaultStyling);
    setDocument(updated);
    const newlyAdded = updated.blocks[updated.blocks.length - 1];
    setSelectedBlockId(newlyAdded.id);
    setIsMobileAddOpen(false);
    toast.success(`Bloco "${def.name}" adicionado com sucesso!`);
  };

  const handleApplyTemplate = (templateId: string) => {
    const updated = applyTemplateToPage(document, templateId);
    setDocument(updated);
    if (updated.blocks.length > 0) {
      setSelectedBlockId(updated.blocks[0].id);
    }
    toast.success("Template aplicado com sucesso!");
  };

  const handleUpdateConfig = (key: string, value: any) => {
    if (!selectedBlockId) return;
    const updated = updateBlockInPage(document, selectedBlockId, { [key]: value });
    setDocument(updated);
  };

  const handleUpdateStyling = (stylingKey: keyof OmniBlockStyling, value: any) => {
    if (!selectedBlockId) return;
    const updated = updateBlockInPage(document, selectedBlockId, {}, { [stylingKey]: value });
    setDocument(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    const updated = moveBlockInPage(document, index, target);
    setDocument(updated);
  };

  const handleDuplicate = (blockId: string) => {
    const updated = duplicateBlockInPage(document, blockId);
    setDocument(updated);
    toast.success("Bloco duplicado!");
  };

  const handleRemove = (blockId: string) => {
    const updated = removeBlockFromPage(document, blockId);
    setDocument(updated);
    if (selectedBlockId === blockId) {
      setSelectedBlockId(updated.blocks[0]?.id || null);
    }
    toast.info("Bloco removido.");
  };

  const handleSaveDocument = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(document);
      }
      toast.success("Página salva com sucesso no banco!");
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
        await onPublish(document);
      }
      toast.success("Página publicada com sucesso! Já está ativa para os visitantes.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao publicar página.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-background text-foreground flex flex-col overflow-hidden select-none font-sans">
      {/* ── TOPBAR DO EDITOR (UNIVERSAL - SOFTWARE PRO SILENCE) ── */}
      <header className="h-13 border-b border-border/80 bg-background/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
              title="Voltar ao painel"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold tracking-tight shrink-0">
            <Sparkles className="size-3.5" />
            <span>Waesy Builder</span>
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
              className="text-xs sm:text-sm font-bold bg-muted/60 text-foreground px-2 py-1 rounded-lg border border-foreground/30 outline-hidden max-w-40 sm:max-w-xs"
            />
          ) : (
            <div
              onClick={() => {
                setTitleDraft(document.title);
                setIsEditingTitle(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer group px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors min-w-0"
              title="Clique para renomear"
            >
              <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate max-w-36 sm:max-w-56">
                {document.title}
              </span>
              <span className="text-xs text-muted-foreground/75 text-muted-foreground font-mono hidden sm:inline">
                /{document.slug}
              </span>
            </div>
          )}
        </div>

        {/* Alternador de Viewport (Desktop Only) */}
        <div className="hidden md:flex items-center gap-0.5 bg-muted/50 p-1 rounded-xl border border-border/60">
          <button
            onClick={() => setViewport("desktop")}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewport === "desktop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Desktop (1440px)"
          >
            <Monitor className="size-4" />
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewport === "mobile" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Mobile (390px)"
          >
            <Smartphone className="size-4" />
          </button>
        </div>

        {/* Cluster de Ações: Preview + Salvar + Publicar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border-border text-xs font-semibold"
          >
            <Eye className="size-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">{isPreviewMode ? "Editar" : "Preview"}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSaveDocument}
            disabled={isSaving || isPublishing}
            variant="outline"
            className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl border-border font-semibold text-xs transition-transform active:scale-95 shadow-xs"
          >
            <Save className="size-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">{isSaving ? "Salvando..." : "Salvar"}</span>
          </Button>

          {onPublish && (
            <Button
              size="sm"
              onClick={handlePublishDocument}
              disabled={isPublishing || isSaving}
              className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs transition-transform active:scale-95 shadow-sm"
            >
              <Send className="size-3.5 sm:mr-1.5" />
              <span>{isPublishing ? "Publicando..." : "Publicar"}</span>
            </Button>
          )}
        </div>
      </header>

      {/* ── 1. EXPERIÊNCIA DESKTOP (SOFTWARE UI 3-PANE) ── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Painel Esquerdo: Biblioteca de Blocos & Templates */}
        {!isPreviewMode && (
          <aside className="w-80 border-r border-border/80 bg-card/60 backdrop-blur-md flex flex-col shrink-0">
            {/* Abas Superiores */}
            <div className="grid grid-cols-2 p-2 border-b border-border/60 gap-1 bg-muted/20">
              <button
                onClick={() => setLeftTab("blocks")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  leftTab === "blocks" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Blocos
              </button>
              <button
                onClick={() => setLeftTab("templates")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  leftTab === "templates" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Modelos
              </button>
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
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                            isActive
                              ? "bg-foreground text-background shadow-xs"
                              : "bg-muted/50 text-muted-foreground hover:text-foreground"
                          }`}
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
                      <div
                        key={block.id}
                        onClick={() => handleAddBlock(block.id)}
                        className="p-2.5 rounded-xl border border-border/70 bg-card hover:border-foreground/30 hover:shadow-xs transition-all cursor-pointer group"
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
                <div className="space-y-2.5">
                  {NICHE_TEMPLATE_MATRIX.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-3 rounded-xl border border-border/70 bg-card hover:border-foreground/30 hover:shadow-xs transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {tpl.name}
                        </span>
                        <span className="text-xs text-muted-foreground/75 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                          {tpl.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2.5">
                        {tpl.description}
                      </p>
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewTemplate(tpl)}
                          className="h-7 px-2 text-xs text-muted-foreground/75 font-semibold gap-1 rounded-lg flex-1 cursor-pointer"
                        >
                          <Eye className="size-3" />
                          <span>Ver ao Vivo</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleApplyTemplate(tpl.id)}
                          className="h-7 px-2 text-xs text-muted-foreground/75 font-bold rounded-lg flex-1 bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
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

        {/* Canvas Central (Área de Visualização WYSIWYG) */}
        <main className="flex-1 bg-muted/15 overflow-y-auto p-4 sm:p-8 flex justify-center">
          <div
            className={`transition-all duration-300 ${
              viewport === "mobile"
                ? "w-[390px] min-h-[844px] shadow-2xl rounded-3xl border border-border/80 overflow-hidden bg-background my-auto"
                : "w-full max-w-6xl shadow-sm bg-background rounded-2xl border border-border/60"
            }`}
          >
            {document.blocks.length === 0 ? (
              <div className="py-24 text-center p-8 flex flex-col items-center">
                <LayoutTemplate className="size-8 text-muted-foreground/30 mb-3" />
                <p className="text-xs font-semibold text-foreground mb-4">Página vazia</p>
                <Button onClick={() => handleApplyTemplate("template_gastronomy")} size="sm" variant="outline" className="h-8 rounded-lg text-xs">
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
                    key={block.id}
                    onClick={() => !isPreviewMode && setSelectedBlockId(block.id)}
                    className={`relative group ${
                      isSelected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background z-20" : ""
                    }`}
                  >
                    {/* Barra Flutuante de Ações no Bloco (Desktop Hover) */}
                    {!isPreviewMode && (
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 backdrop-blur-md border border-border/80 rounded-xl p-1 shadow-lg flex items-center gap-1 z-30">
                        <span className="text-xs text-muted-foreground/75 font-mono text-muted-foreground px-2">
                          {def.name}
                        </span>
                        <button
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMove(index, "up");
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
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
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Descer"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(block.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Duplicar"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(block.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}

                    <Component id={block.id} data={block.config} styling={block.styling} />
                  </div>
                );
              })
            )}
          </div>
        </main>

        {/* Painel Direito: Inspector Profundo (Conteúdo + Estilo) */}
        {!isPreviewMode && selectedBlock && (
          <aside className="w-80 border-l border-border/80 bg-card/60 backdrop-blur-md flex flex-col shrink-0">
            <div className="grid grid-cols-2 p-2 border-b border-border/60 gap-1 bg-muted/20">
              <button
                onClick={() => setInspectorTab("content")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  inspectorTab === "content" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Settings2 className="size-3.5" />
                Conteúdo
              </button>
              <button
                onClick={() => setInspectorTab("styling")}
                className={`py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  inspectorTab === "styling" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Palette className="size-3.5" />
                Estilo
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {inspectorTab === "content" ? (
                <BlockContentFields
                  selectedBlock={selectedBlock}
                  onUpdateConfig={handleUpdateConfig}
                />
              ) : (
                /* Aba de Estilo Isolado */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Espaçamento Vertical (Padding)
                    </label>
                    <select
                      value={selectedBlock.styling?.paddingY || "md"}
                      onChange={(e) => handleUpdateStyling("paddingY", e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs"
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
                      className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs"
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
                        value={selectedBlock.styling?.backgroundColor || "#ffffff"}
                        onChange={(e) => handleUpdateStyling("backgroundColor", e.target.value)}
                        className="size-8 rounded-lg cursor-pointer border border-border"
                      />
                      <Input
                        value={selectedBlock.styling?.backgroundColor || ""}
                        onChange={(e) => handleUpdateStyling("backgroundColor", e.target.value)}
                        placeholder="Padrão do tema"
                        className="h-9 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── 2. EXPERIÊNCIA MOBILE (CANVAS CONSOME A TELA TODA + BARRA INFERIOR FLUTUANTE) ── */}
      <div className="flex md:hidden flex-1 flex-col overflow-y-auto relative pb-28">
        {document.blocks.length === 0 ? (
          <div className="py-24 text-center p-6 flex flex-col items-center justify-center flex-1">
            <LayoutTemplate className="size-8 text-muted-foreground/30 mb-3" />
            <p className="text-xs font-semibold text-foreground mb-4">Página vazia</p>
            <Button
              onClick={() => handleApplyTemplate("template_gastronomy")}
              size="sm"
              variant="outline"
              className="h-9 px-4 rounded-xl text-xs font-semibold"
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
                <div
                  key={block.id}
                  onClick={() => {
                    if (!isPreviewMode) {
                      setSelectedBlockId(block.id);
                    }
                  }}
                  className={`relative rounded-2xl overflow-hidden transition-all ${
                    isSelected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
                  }`}
                >
                  {/* Tag do Bloco Ativo no Mobile */}
                  {isSelected && (
                    <div className="absolute top-2 left-2 z-30 bg-background/95 backdrop-blur-md border border-border/80 rounded-lg px-2 py-0.5 shadow-xs flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs text-muted-foreground/75 font-bold text-foreground">{def.name}</span>
                    </div>
                  )}

                  <Component id={block.id} data={block.config} styling={block.styling} />
                </div>
              );
            })}
          </div>
        )}

        {/* Barra Inferior Flutuante (Floating Bottom Bar - 44px Touch Targets) */}
        {!isPreviewMode && (
          <div className="fixed bottom-3 left-3 right-3 z-40 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-xl p-1.5 flex items-center justify-around">
            <button
              onClick={() => setIsMobileAddOpen(true)}
              className="h-11 flex-1 flex flex-col items-center justify-center rounded-xl text-muted-foreground hover:text-foreground active:bg-muted/60 transition-colors"
            >
              <Plus className="size-4" />
              <span className="text-xs text-muted-foreground/75 font-semibold mt-0.5">Blocos</span>
            </button>

            <button
              onClick={() => {
                if (!selectedBlockId && document.blocks[0]) {
                  setSelectedBlockId(document.blocks[0].id);
                }
                setIsMobileSheetOpen(true);
              }}
              disabled={document.blocks.length === 0}
              className="h-11 flex-1 flex flex-col items-center justify-center rounded-xl text-muted-foreground hover:text-foreground active:bg-muted/60 transition-colors disabled:opacity-30"
            >
              <Settings2 className="size-4" />
              <span className="text-xs text-muted-foreground/75 font-semibold mt-0.5">Editar</span>
            </button>

            <button
              onClick={() => setIsMobileTemplateOpen(true)}
              className="h-11 flex-1 flex flex-col items-center justify-center rounded-xl text-muted-foreground hover:text-foreground active:bg-muted/60 transition-colors"
            >
              <LayoutTemplate className="size-4" />
              <span className="text-xs text-muted-foreground/75 font-semibold mt-0.5">Modelos</span>
            </button>

            <button
              onClick={() => setIsMobileLayersOpen(true)}
              disabled={document.blocks.length === 0}
              className="h-11 flex-1 flex flex-col items-center justify-center rounded-xl text-muted-foreground hover:text-foreground active:bg-muted/60 transition-colors disabled:opacity-30"
            >
              <Layers className="size-4" />
              <span className="text-xs text-muted-foreground/75 font-semibold mt-0.5">Ordem</span>
            </button>
          </div>
        )}
      </div>

      {/* ── MOBILE BOTTOM SHEET: ADICIONAR BLOCO (85vh) ── */}
      <Sheet open={isMobileAddOpen} onOpenChange={setIsMobileAddOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-5 flex flex-col">
          <SheetHeader className="mb-2">
            <SheetTitle className="text-sm font-bold tracking-tight">Adicionar Bloco</SheetTitle>
          </SheetHeader>

          {/* Chips de filtro de categoria Wix no Mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none shrink-0">
            {WIX_CATEGORY_CONFIG.map((cat) => {
              const CatIcon = cat.icon;
              const isActive = activeBlockCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveBlockCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? "bg-foreground text-background shadow-xs"
                      : "bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <CatIcon className="size-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredBlocks.map((block) => {
              const Icon = BLOCK_ICONS[block.id] || LayoutTemplate;
              return (
                <div
                  key={block.id}
                  onClick={() => handleAddBlock(block.id)}
                  className="p-3 rounded-xl border border-border/70 bg-card active:bg-muted/60 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-foreground shrink-0">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{block.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
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
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-5 flex flex-col">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-sm font-bold tracking-tight">
              {selectedBlock ? getSiteBlockById(selectedBlock.type).name : "Editar Bloco"}
            </SheetTitle>
          </SheetHeader>

          {selectedBlock ? (
            <div className="flex-1 overflow-y-auto space-y-4 pb-6">
              {/* Abas Conteúdo / Estilo */}
              <div className="grid grid-cols-2 p-1 bg-muted/40 rounded-xl border border-border/60 gap-1">
                <button
                  onClick={() => setMobileInspectorTab("content")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    mobileInspectorTab === "content"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground"
                  }`}
                >
                  <Settings2 className="size-3.5" />
                  Conteúdo
                </button>
                <button
                  onClick={() => setMobileInspectorTab("styling")}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    mobileInspectorTab === "styling"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground"
                  }`}
                >
                  <Palette className="size-3.5" />
                  Estilo
                </button>
              </div>

              {mobileInspectorTab === "content" ? (
                <div className="pt-1">
                  <BlockContentFields
                    selectedBlock={selectedBlock}
                    onUpdateConfig={handleUpdateConfig}
                  />
                </div>
              ) : (
                /* Aba de Estilo Mobile */
                <div className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Espaçamento Vertical (Padding)
                    </label>
                    <select
                      value={selectedBlock.styling?.paddingY || "md"}
                      onChange={(e) => handleUpdateStyling("paddingY", e.target.value)}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs"
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
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs"
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
                        value={selectedBlock.styling?.backgroundColor || "#ffffff"}
                        onChange={(e) => handleUpdateStyling("backgroundColor", e.target.value)}
                        className="size-10 rounded-xl cursor-pointer border border-border"
                      />
                      <Input
                        value={selectedBlock.styling?.backgroundColor || ""}
                        onChange={(e) => handleUpdateStyling("backgroundColor", e.target.value)}
                        placeholder="Padrão do tema"
                        className="h-10 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setIsMobileSheetOpen(false)}
                className="w-full h-11 rounded-xl bg-foreground text-background font-bold mt-4"
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
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-5 flex flex-col">
          <SheetHeader className="mb-3">
            <SheetTitle className="text-sm font-bold tracking-tight">Modelos de Página</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-2.5">
            {NICHE_TEMPLATE_MATRIX.map((tpl) => (
              <div
                key={tpl.id}
                className="p-3.5 rounded-2xl border border-border/70 bg-card transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-foreground">{tpl.name}</h4>
                  <span className="text-xs text-muted-foreground/75 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                    {tpl.badge}
                  </span>
                </div>
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
                    className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl flex-1 cursor-pointer"
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
                    className="h-8 px-3 text-xs font-bold rounded-xl flex-1 bg-foreground text-background cursor-pointer"
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
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-5 flex flex-col">
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
                  className="p-3 rounded-xl border border-border/80 bg-card flex items-center justify-between shadow-xs"
                >
                  <div
                    onClick={() => {
                      setSelectedBlockId(block.id);
                      setIsMobileLayersOpen(false);
                    }}
                    className="flex-1 pr-2 cursor-pointer min-w-0"
                  >
                    <span className="text-xs text-muted-foreground/75 font-mono text-muted-foreground uppercase tracking-wider block">
                      {def.name}
                    </span>
                    <h4 className="text-xs font-bold text-foreground truncate">{title}</h4>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={index === 0}
                      onClick={() => handleMove(index, "up")}
                      className="size-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground disabled:opacity-30"
                      title="Subir"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      disabled={index === document.blocks.length - 1}
                      onClick={() => handleMove(index, "down")}
                      className="size-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground disabled:opacity-30"
                      title="Descer"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(block.id)}
                      className="size-8 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground"
                      title="Duplicar"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(block.id)}
                      className="size-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive"
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
    </div>
  );
};

export const WaesyBuilder = OmniEditor;
export type WaesyBuilderProps = OmniEditorProps;
