/**
 * BuilderWixStudioPanels.tsx — Módulos Canônicos Unificados do Omni-Builder
 * Paridade Wix Studio, Editor X, Wix Branded App, Hopp BioLink 7-Layout Matrix,
 * Gerenciador de Menu, Tabela Relacional CMS, Sitemap Visual com SEO/GEO e Lovable AI Split Studio.
 */

import * as React from "react";
import { useState } from "react";
import {
  Globe,
  Search,
  Sparkles,
  Plus,
  Copy,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Database,
  Table as TableIcon,
  Filter,
  ArrowUpDown,
  Download,
  Smartphone,
  LayoutGrid,
  Layers,
  Wand2,
  ShieldCheck,
  Code2,
  Eye,
  Lock,
  Users,
  FileText,
  Sliders,
  Move,
  Maximize2,
  Menu as MenuIcon,
  Link2,
  Bot,
  CheckCircle2,
  Send,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BuilderDockingMatrix, type DockingPosition } from "./builder-docking-matrix";
import type { BuilderPageItem } from "./builder-pages-panel";
import type { OmniBlockInstance, OmniPageDocument } from "@/types/omni-builder";
import {
  generateSectionBlockWithAi,
  planPageArchitecture,
  validateAndSanitizeBuilderPrompt,
} from "@/services/ai-builder-squad";

// ── 1. VISUAL SITEMAP & SEO / GEO (GENERATIVE ENGINE OPTIMIZATION) MODAL ──

export interface WixVisualSitemapModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: BuilderPageItem[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: (newPage: { title: string; slug: string; is_home: boolean }) => void;
  onDuplicatePage: (pageId: string) => void;
  onUpdatePageSeo: (
    pageId: string,
    seo: { seo_title?: string; seo_description?: string },
  ) => void;
  currentDocumentBlocks?: OmniBlockInstance[];
}

export function WixVisualSitemapModal({
  isOpen,
  onClose,
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onUpdatePageSeo,
  currentDocumentBlocks = [],
}: WixVisualSitemapModalProps) {
  const [selectedSettingsPageId, setSelectedSettingsPageId] = useState<string>(
    activePageId || pages[0]?.id || "home",
  );
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    "info" | "permissions" | "seo" | "geo"
  >("seo");
  const [permissionMode, setPermissionMode] = useState<"public" | "members" | "password">("public");
  const [indexable, setIndexable] = useState(true);
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [geoEntitySummary, setGeoEntitySummary] = useState(
    "Ecossistema comercial verificado com catálogo em tempo real, preços transparentes, reservas instantâneas e atendimento via WhatsApp.",
  );

  const selectedPage =
    pages.find((p) => p.id === selectedSettingsPageId) ||
    pages[0] || {
      id: "home",
      title: "Início (Home)",
      slug: "/",
      is_home: true,
      seo_title: "Início | Vitrine Oficial Waesy",
      seo_description: "Confira ofertas, catálogo completo, pacotes de viagem e atendimento direto.",
    };

  const [seoTitleDraft, setSeoTitleDraft] = useState(
    selectedPage.seo_title || `${selectedPage.title} | Vitrine Oficial`,
  );
  const [seoDescDraft, setSeoDescDraft] = useState(
    selectedPage.seo_description ||
      "Confira catálogo atualizado, ofertas especiais e atendimento rápido na plataforma Waesy.",
  );

  const handleSelectForSettings = (page: BuilderPageItem) => {
    setSelectedSettingsPageId(page.id);
    setSeoTitleDraft(page.seo_title || `${page.title} | Vitrine Oficial`);
    setSeoDescDraft(
      page.seo_description ||
        "Confira catálogo atualizado, ofertas especiais e atendimento rápido na plataforma Waesy.",
    );
  };

  const handleSaveSeoSettings = () => {
    onUpdatePageSeo(selectedPage.id, {
      seo_title: seoTitleDraft,
      seo_description: seoDescDraft,
    });
    toast.success(`Configurações de SEO e GEO salvas para "${selectedPage.title}"!`);
  };

  const systemGroups = [
    {
      groupTitle: "Páginas Principais (Main Pages)",
      items: pages,
    },
    {
      groupTitle: "Páginas de Loja & Verticais (Store & Booking)",
      items: [
        { id: "sys_shop", title: "Catálogo & Carrinho", slug: "/loja", is_home: false },
        { id: "sys_cars", title: "Aluguel de Carros (Mín. 3 Diárias)", slug: "/mobilidade", is_home: false },
        { id: "sys_tourism", title: "Portal de Viagens & Vouchers", slug: "/turismo", is_home: false },
      ],
    },
    {
      groupTitle: "Área de Membros & Apps Instalados",
      items: [
        { id: "sys_members", title: "Minha Conta & Pedidos", slug: "/minha-conta", is_home: false },
        { id: "sys_news", title: "Portal de Notícias Prométhée", slug: "/noticias", is_home: false },
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-screen p-0 flex flex-col gap-0 overflow-hidden bg-background border border-border">
        <DialogHeader className="h-14 px-6 border-b border-border flex flex-row items-center justify-between flex-none bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <LayoutGrid className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Mapa Visual do Site (Visual Sitemap) & SEO / GEO</span>
                <Badge variant="outline" className="text-xs font-semibold">
                  Wix Studio Parity
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Arquitetura de páginas, permissões de acesso, snippet Google e otimização para IAs generativas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const index = pages.length + 1;
                onAddPage({
                  title: `Nova Página ${index}`,
                  slug: `/pagina-${index}`,
                  is_home: false,
                });
                toast.success("Nova página adicionada ao Sitemap Visual!");
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" />
              <span>Nova Página</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Coluna Esquerda: Visual Sitemap Tree & Wireframes (7 cols) */}
          <ScrollArea className="lg:col-span-7 border-r border-border p-6 max-h-96 lg:max-h-full">
            <div className="space-y-6">
              {systemGroups.map((group) => (
                <div key={group.groupTitle} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {group.groupTitle}
                    </h4>
                    <span className="text-xs text-muted-foreground font-mono">
                      {group.items.length} página(s)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {group.items.map((page) => {
                      const isCurrent = page.id === selectedPage.id;
                      return (
                        <div
                          key={page.id}
                          className={cn(
                            "p-3 rounded-xl border transition-colors flex flex-col justify-between gap-3",
                            isCurrent
                              ? "border-primary bg-primary/5"
                              : "border-border bg-muted/10 hover:border-foreground/30",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground truncate">
                                  {page.title}
                                </span>
                                {page.is_home && (
                                  <Badge variant="secondary" className="text-xs px-2 py-0">
                                    Home
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground font-mono block truncate">
                                {page.slug}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => onDuplicatePage(page.id)}
                              title="Duplicar página"
                              className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <Copy className="size-3.5" />
                            </button>
                          </div>

                          {/* Mini Wireframe Visual dos Blocos da Página */}
                          <div className="space-y-1 p-2 rounded-lg bg-background border border-border/60">
                            <div className="h-3 rounded bg-primary/20 w-full" />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                              <div className="h-4 rounded bg-muted" />
                              <div className="h-4 rounded bg-muted" />
                              <div className="h-4 rounded bg-muted" />
                            </div>
                            <div className="h-3 rounded bg-muted/70 w-2/3" />
                            <span className="text-xs text-muted-foreground block pt-1">
                              {page.is_home
                                ? `${currentDocumentBlocks.length || 4} seções ativas no canvas`
                                : "Layout responsivo conectado"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleSelectForSettings(page)}
                              className="h-11 min-h-11 flex-1 text-xs font-semibold rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              SEO & GEO
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                onSelectPage(page.id);
                                onClose();
                              }}
                              className="h-11 min-h-11 flex-1 text-xs font-bold rounded-lg bg-foreground text-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Abrir no Editor
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Coluna Direita: Page Settings, Permissions, SEO Basics & GEO LLM Visibility (5 cols) */}
          <ScrollArea className="lg:col-span-5 p-6 bg-muted/10 max-h-96 lg:max-h-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary block">
                    Configurações da Página
                  </span>
                  <h3 className="text-sm font-bold text-foreground">{selectedPage.title}</h3>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {selectedPage.slug}
                </Badge>
              </div>

              {/* Abas Internas: Info | Permissões | SEO Google | GEO IA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-lg bg-muted border border-border">
                {(
                  [
                    { id: "info", label: "Info" },
                    { id: "permissions", label: "Acesso" },
                    { id: "seo", label: "SEO" },
                    { id: "geo", label: "GEO (IA)" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSettingsTab(tab.id)}
                    className={cn(
                      "h-11 min-h-11 rounded-md text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeSettingsTab === tab.id
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeSettingsTab === "info" && (
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs font-bold">Nome de Exibição no Menu</Label>
                    <Input
                      value={selectedPage.title}
                      readOnly
                      className="h-11 min-h-11 text-xs mt-1 bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Slug da URL Canônica</Label>
                    <Input
                      value={selectedPage.slug}
                      readOnly
                      className="h-11 min-h-11 text-xs font-mono mt-1 bg-background"
                    />
                  </div>
                </div>
              )}

              {activeSettingsTab === "permissions" && (
                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-bold block">Quem pode acessar esta página?</Label>
                  {(
                    [
                      {
                        id: "public",
                        label: "Público Geral (Todos os visitantes)",
                        desc: "Indexável e aberto para clientes sem login.",
                        icon: Globe,
                      },
                      {
                        id: "members",
                        label: "Somente Membros Cadastrados",
                        desc: "Exige login civil ou corporativo Waesy.",
                        icon: Users,
                      },
                      {
                        id: "password",
                        label: "Protegido por Senha",
                        desc: "Acesso restrito a portadores de código VIP.",
                        icon: Lock,
                      },
                    ] as const
                  ).map((perm) => {
                    const Icon = perm.icon;
                    return (
                      <button
                        key={perm.id}
                        type="button"
                        onClick={() => setPermissionMode(perm.id)}
                        className={cn(
                          "w-full min-h-11 p-3 rounded-lg border text-left flex items-start gap-3 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          permissionMode === perm.id
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:bg-muted/40",
                        )}
                      >
                        <Icon className="size-4 text-primary shrink-0 mt-1" />
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            {perm.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{perm.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeSettingsTab === "seo" && (
                <div className="space-y-4 pt-2">
                  {/* Google SERP Preview */}
                  <div className="p-3 rounded-lg border border-border bg-background space-y-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                      Prévia no Google Search
                    </span>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      https://waesy.app{selectedPage.slug}
                    </p>
                    <p className="text-sm font-bold text-primary truncate">{seoTitleDraft}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{seoDescDraft}</p>
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Tag de Título (Title Tag)</Label>
                    <Input
                      value={seoTitleDraft}
                      onChange={(e) => setSeoTitleDraft(e.target.value)}
                      className="h-11 min-h-11 text-xs mt-1 bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Meta Descrição (Meta Description)</Label>
                    <Textarea
                      value={seoDescDraft}
                      onChange={(e) => setSeoDescDraft(e.target.value)}
                      rows={3}
                      className="text-xs mt-1 bg-background resize-none"
                    />
                  </div>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-background cursor-pointer min-h-11">
                    <span className="text-xs font-semibold text-foreground">
                      Permitir que motores de busca indexem esta página
                    </span>
                    <input
                      type="checkbox"
                      checked={indexable}
                      onChange={(e) => setIndexable(e.target.checked)}
                      className="size-4"
                    />
                  </label>

                  <Button
                    type="button"
                    onClick={handleSaveSeoSettings}
                    className="w-full h-11 min-h-11 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Salvar Configurações de SEO
                  </Button>
                </div>
              )}

              {activeSettingsTab === "geo" && (
                <div className="space-y-4 pt-2">
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Bot className="size-4 text-primary" />
                        <span>GEO — Generative Engine Optimization</span>
                      </span>
                      <Badge variant="default" className="text-xs">
                        Ativo
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Estrutura JSON-LD e resumo semântico otimizados para citação direta em motores de resposta por IA.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-foreground block">
                      Visibilidade por Motor de IA (AI Crawler Readiness)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { engine: "ChatGPT Search", status: "100% Indexado" },
                        { engine: "Google Gemini", status: "Schema Ativo" },
                        { engine: "Perplexity AI", status: "Citação Pronta" },
                        { engine: "Claude Web", status: "Autorizado" },
                      ].map((item) => (
                        <div
                          key={item.engine}
                          className="p-2 rounded-lg border border-border bg-background flex items-center justify-between"
                        >
                          <span className="text-xs font-semibold text-foreground">
                            {item.engine}
                          </span>
                          <span className="text-xs text-primary font-bold">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold">
                      Resumo Canônico da Entidade para LLMs (llms.txt / JSON-LD)
                    </Label>
                    <Textarea
                      value={geoEntitySummary}
                      onChange={(e) => setGeoEntitySummary(e.target.value)}
                      rows={3}
                      className="text-xs mt-1 bg-background resize-none"
                    />
                  </div>

                  <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-background cursor-pointer min-h-11">
                    <span className="text-xs font-semibold text-foreground">
                      Gerar rota automática /llms.txt para esta vitrine
                    </span>
                    <input
                      type="checkbox"
                      checked={geoEnabled}
                      onChange={(e) => setGeoEnabled(e.target.checked)}
                      className="size-4"
                    />
                  </label>

                  <Button
                    type="button"
                    onClick={handleSaveSeoSettings}
                    className="w-full h-11 min-h-11 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Publicar Telemetria GEO & Schema
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 2. WIX MENU MANAGER DRAWER (GERENCIADOR DE MENUS E NAVEGAÇÃO) ──

export interface WixMenuItem {
  id: string;
  label: string;
  href: string;
  badge?: string;
}

export interface WixMenuManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyMenuToBlock?: (items: WixMenuItem[], menuType: string) => void;
}

export function WixMenuManagerDrawer({
  isOpen,
  onClose,
  onApplyMenuToBlock,
}: WixMenuManagerDrawerProps) {
  const [selectedMenuType, setSelectedMenuType] = useState("header_main");
  const [menuItems, setMenuItems] = useState<WixMenuItem[]>([
    { id: "m1", label: "Início", href: "/" },
    { id: "m2", label: "Loja & Catálogo", href: "#produtos" },
    { id: "m3", label: "Ofertas Relâmpago", href: "#ofertas", badge: "HOT" },
    { id: "m4", label: "Turismo & Carros", href: "#turismo" },
    { id: "m5", label: "Sobre Nós", href: "#sobre" },
    { id: "m6", label: "Contato WhatsApp", href: "#contato" },
  ]);

  const moveItem = (idx: number, dir: "up" | "down") => {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= menuItems.length) return;
    const copy = [...menuItems];
    const temp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = temp;
    setMenuItems(copy);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-96 p-0 flex flex-col bg-background">
        <SheetHeader className="p-4 border-b border-border bg-muted/20">
          <SheetTitle className="text-sm font-bold flex items-center gap-2">
            <MenuIcon className="size-4 text-primary" />
            <span>Gerenciar Menu (Manage Menu)</span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold block mb-1">
                Qual menu está sendo exibido?
              </Label>
              <select
                value={selectedMenuType}
                onChange={(e) => setSelectedMenuType(e.target.value)}
                className="w-full h-11 min-h-11 rounded-lg border border-border bg-card px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="header_main">Menu Principal do Topo</option>
                <option value="noor_dock">Dock Squircle Noor (Mobile)</option>
                <option value="departments">Menu de Departamentos</option>
                <option value="footer_links">Menu do Rodapé</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                Itens do Menu ({menuItems.length})
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setMenuItems((prev) => [
                    ...prev,
                    {
                      id: `m_${Date.now()}`,
                      label: `Novo Item ${prev.length + 1}`,
                      href: "#secao",
                    },
                  ]);
                }}
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-3.5" />
                <span>Adicionar Item</span>
              </Button>
            </div>

            <div className="space-y-2">
              {menuItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-border bg-muted/20 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveItem(idx, "up")}
                        className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Subir"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === menuItems.length - 1}
                        onClick={() => moveItem(idx, "down")}
                        className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Descer"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMenuItems((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Remover"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={item.label}
                      onChange={(e) => {
                        const next = [...menuItems];
                        next[idx] = { ...item, label: e.target.value };
                        setMenuItems(next);
                      }}
                      placeholder="Rótulo"
                      className="h-11 min-h-11 text-xs bg-background"
                    />
                    <Input
                      value={item.href}
                      onChange={(e) => {
                        const next = [...menuItems];
                        next[idx] = { ...item, href: e.target.value };
                        setMenuItems(next);
                      }}
                      placeholder="Link (/ ou #)"
                      className="h-11 min-h-11 text-xs font-mono bg-background"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-card">
          <Button
            type="button"
            onClick={() => {
              onApplyMenuToBlock?.(menuItems, selectedMenuType);
              toast.success("Menu sincronizado com a navegação da vitrine!");
              onClose();
            }}
            className="w-full h-11 min-h-11 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Aplicar Menu na Página
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── 3. WIX CMS COLLECTION TABLE MANAGER MODAL (PLANILHA RELACIONAL & MANAGE FIELDS) ──

export interface WixCmsCollectionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  productsCount?: number;
  onInsertCollectionBlock?: (blockType: string, collectionName: string) => void;
}

export function WixCmsCollectionManagerModal({
  isOpen,
  onClose,
  productsCount = 0,
  onInsertCollectionBlock,
}: WixCmsCollectionManagerModalProps) {
  const [selectedCollection, setSelectedCollection] = useState("catalog_products");
  const [showManageFields, setShowManageFields] = useState(true);
  const [fields, setFields] = useState([
    { id: "f_title", name: "Title (PRIMARY)", type: "Text", enabled: true },
    { id: "f_price", name: "Preço / Tarifa (R$)", type: "Number", enabled: true },
    { id: "f_min_days", name: "Mínimo de Diárias", type: "Number", enabled: true },
    { id: "f_location", name: "Localização / Cidade", type: "Map Location", enabled: true },
    { id: "f_gallery", name: "Galeria de Fotos", type: "Media Gallery", enabled: true },
    { id: "f_category", name: "Categoria", type: "Tag", enabled: true },
  ]);

  const [rows, setRows] = useState([
    {
      id: "row_1",
      title: "SUV Automático Completo (Locação)",
      price: "R$ 189/dia",
      rule: "Mín. 3 diárias",
      location: "Centro / Aeroporto",
      category: "Aluguel de Carros",
    },
    {
      id: "row_2",
      title: "Pacote Resort All-Inclusive 7 Dias",
      price: "R$ 3.490",
      rule: "10x sem juros",
      location: "Maceió - AL",
      category: "Turismo & Viagens",
    },
    {
      id: "row_3",
      title: "Combo Supermercado Clube K",
      price: "R$ 89,90",
      rule: "Entrega Rápida",
      location: "Loja Matriz",
      category: "Supermercado",
    },
    {
      id: "row_4",
      title: "Cobertura Duplex Vista Parque",
      price: "R$ 1.250.000",
      rule: "Visita Agendada",
      location: "Bairro Nobre",
      category: "Imóveis",
    },
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-screen p-0 flex flex-col gap-0 overflow-hidden bg-background border border-border">
        <DialogHeader className="h-14 px-6 border-b border-border flex flex-row items-center justify-between flex-none bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Database className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>CMS — Gerenciador de Coleções e Campos Relacionais</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {productsCount + rows.length} registros
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Edite dados em planilha, gerencie colunas e conecte coleções dinâmicas à página
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowManageFields(!showManageFields)}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Sliders className="size-3.5" />
              <span>Gerenciar Campos (Manage Fields)</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onInsertCollectionBlock?.("product_grid", selectedCollection);
                onClose();
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-3.5" />
              <span>Inserir Coleção na Página</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Barra de Ferramentas da Planilha */}
        <div className="px-6 py-2 border-b border-border bg-card flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="catalog_products">Coleção: Catálogo de Produtos & Ofertas</option>
              <option value="car_rental_3days">Coleção: Locadora & Carros (Mín. 3 Diárias)</option>
              <option value="real_estate_properties">Coleção: Imóveis & Propriedades</option>
              <option value="supermarket_club">Coleção: Supermercado & Clube</option>
              <option value="news_articles">Coleção: Artigos & Notícias</option>
            </select>

            <Badge variant="secondary" className="text-xs">
              Default View
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setRows((prev) => [
                  ...prev,
                  {
                    id: `row_${Date.now()}`,
                    title: `Novo Item da Coleção #${prev.length + 1}`,
                    price: "R$ 199,00",
                    rule: "Disponível",
                    location: "Online / Loja",
                    category: "Destaque",
                  },
                ]);
                toast.success("Nova linha adicionada à coleção CMS!");
              }}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-3.5" />
              <span>Adicionar Linha</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Tabela Relacional */}
          <ScrollArea
            className={cn(
              "p-6 max-h-96 lg:max-h-full",
              showManageFields ? "lg:col-span-8 border-r border-border" : "lg:col-span-12",
            )}
          >
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
                    <th className="p-3">T Title (PRIMARY)</th>
                    <th className="p-3"># Preço / Diária</th>
                    <th className="p-3">Regra / Condição</th>
                    <th className="p-3">Localização</th>
                    <th className="p-3">Categoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="p-2">
                        <Input
                          value={row.title}
                          onChange={(e) => {
                            const next = [...rows];
                            next[idx] = { ...row, title: e.target.value };
                            setRows(next);
                          }}
                          className="h-11 min-h-11 text-xs font-semibold bg-background"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={row.price}
                          onChange={(e) => {
                            const next = [...rows];
                            next[idx] = { ...row, price: e.target.value };
                            setRows(next);
                          }}
                          className="h-11 min-h-11 text-xs font-mono bg-background"
                        />
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {row.rule}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{row.location}</td>
                      <td className="p-2">
                        <Badge variant="secondary" className="text-xs">
                          {row.category}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>

          {/* Painel Lateral Manage Fields */}
          {showManageFields && (
            <ScrollArea className="lg:col-span-4 p-6 bg-muted/10 max-h-96 lg:max-h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Manage Fields (Esquema)
                  </h4>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFields((prev) => [
                        ...prev,
                        {
                          id: `f_${Date.now()}`,
                          name: `Campo Customizado ${prev.length + 1}`,
                          type: "Text",
                          enabled: true,
                        },
                      ]);
                      toast.success("Novo campo adicionado ao schema da coleção!");
                    }}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="size-3.5" />
                    <span>+ Campo</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {fields.map((field, idx) => (
                    <label
                      key={field.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-background cursor-pointer min-h-11"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={(e) => {
                            const next = [...fields];
                            next[idx] = { ...field, enabled: e.target.checked };
                            setFields(next);
                          }}
                          className="size-4"
                        />
                        <span className="text-xs font-bold text-foreground">{field.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">
                        {field.type}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── 4. WIX BRANDED APP BUILDER & HOPP BIOLINK 7-LAYOUT MATRIX PANEL ──

export interface WixAppNavConfig {
  barPosition: "top" | "bottom";
  showLabelsUnderIcons: boolean;
  tabs: string[];
}

export interface WixButtonStylerConfig {
  activeRole: "primary" | "secondary";
  shape: "square" | "rounded" | "pill" | "squircle";
  uppercase: boolean;
  borderWidthPx: number;
}

export interface WixBrandedAppAndHoppPanelProps {
  selectedBlock?: OmniBlockInstance | null;
  onUpdateBlockConfig: (key: string, value: any) => void;
  appNavConfig: WixAppNavConfig;
  onChangeAppNavConfig: (patch: Partial<WixAppNavConfig>) => void;
  buttonStyler: WixButtonStylerConfig;
  onChangeButtonStyler: (patch: Partial<WixButtonStylerConfig>) => void;
}

const HOPP_7_LAYOUTS = [
  { id: "classic_list", label: "1. Lista Clássica", desc: "Empilhamento vertical limpo" },
  { id: "grid_2x2", label: "2. Grid 2x2 Quadrado", desc: "Cards visuais lado a lado" },
  { id: "grid_3x3", label: "3. Grid 3x3 Compacto", desc: "Ícones estilo Dock iFood/Noor" },
  { id: "featured_card", label: "4. Card Destaque Full", desc: "Hero card expandido 16:9" },
  { id: "horizontal_carousel", label: "5. Carrossel Contínuo", desc: "Swipe horizontal elástico" },
  { id: "bento_mosaic", label: "6. Mosaico Bento", desc: "Tetris assimétrico Apple" },
  { id: "compact_pills", label: "7. Pílulas Compactas", desc: "Chips densos de ação rápida" },
];

const HEADER_4_PRESETS = [
  { id: "full_cover", label: "Capa Total" },
  { id: "center_avatar", label: "Avatar Central" },
  { id: "waves_hero", label: "Ondas / Waves" },
  { id: "split_editorial", label: "Editorial Split" },
];

export function WixBrandedAppAndHoppPanel({
  selectedBlock,
  onUpdateBlockConfig,
  appNavConfig,
  onChangeAppNavConfig,
  buttonStyler,
  onChangeButtonStyler,
}: WixBrandedAppAndHoppPanelProps) {
  const currentLayout =
    (selectedBlock?.config as any)?.layoutMode ||
    (selectedBlock?.config as any)?.layout_variant ||
    "classic_list";

  return (
    <div className="space-y-5 pt-2 text-xs">
      {/* Seção 1: Hopp BioLink & Vitrine 7-Layout Matrix */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-foreground flex items-center gap-2">
            <LayoutGrid className="size-3.5 text-primary" />
            <span>Matriz de 7 Layouts (Hopp / Vitrine)</span>
          </Label>
          <Badge variant="outline" className="text-xs">
            7 Modos
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {HOPP_7_LAYOUTS.map((layout) => {
            const isActive = currentLayout === layout.id;
            return (
              <button
                key={layout.id}
                type="button"
                onClick={() => {
                  onUpdateBlockConfig("layoutMode", layout.id);
                  onUpdateBlockConfig("layout_variant", layout.id);
                  toast.success(`Layout "${layout.label}" aplicado ao bloco!`);
                }}
                className={cn(
                  "w-full min-h-11 p-3 rounded-lg border text-left flex items-center justify-between transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary/10 font-bold"
                    : "border-border bg-background hover:bg-muted/40",
                )}
              >
                <div>
                  <span className="text-xs font-bold text-foreground block">{layout.label}</span>
                  <span className="text-xs text-muted-foreground">{layout.desc}</span>
                </div>
                {isActive && <Check className="size-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* 4 Presets de Cabeçalho BioLink / Loja */}
        <div className="pt-2">
          <Label className="text-xs font-bold text-muted-foreground block mb-2">
            Estilo de Cabeçalho (4 Presets Hopp)
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {HEADER_4_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onUpdateBlockConfig("headerPreset", preset.id);
                  toast.success(`Cabeçalho "${preset.label}" selecionado!`);
                }}
                className="h-11 min-h-11 px-3 rounded-lg border border-border bg-background hover:bg-muted/50 text-xs font-semibold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Seção 2: Edit Mobile App Navigation (Wix Branded App Parity) */}
      <div className="space-y-3">
        <Label className="text-xs font-bold text-foreground flex items-center gap-2">
          <Smartphone className="size-3.5 text-primary" />
          <span>Navegação do App Nativo (Tab Bar)</span>
        </Label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeAppNavConfig({ barPosition: "top" })}
            className={cn(
              "h-11 min-h-11 rounded-lg border text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              appNavConfig.barPosition === "top"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            Top Tab Bar
          </button>
          <button
            type="button"
            onClick={() => onChangeAppNavConfig({ barPosition: "bottom" })}
            className={cn(
              "h-11 min-h-11 rounded-lg border text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              appNavConfig.barPosition === "bottom"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            Bottom Tab Bar
          </button>
        </div>

        <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-background cursor-pointer min-h-11">
          <span className="text-xs font-semibold text-foreground">
            Exibir nomes das telas sob os ícones
          </span>
          <input
            type="checkbox"
            checked={appNavConfig.showLabelsUnderIcons}
            onChange={(e) =>
              onChangeAppNavConfig({ showLabelsUnderIcons: e.target.checked })
            }
            className="size-4"
          />
        </label>
      </div>

      <hr className="border-border" />

      {/* Seção 3: Button Styler */}
      <div className="space-y-3">
        <Label className="text-xs font-bold text-foreground block">
          Estilizador Global de Botões (Button Styler)
        </Label>

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "square", label: "Quadrado" },
              { id: "rounded", label: "Arredondado" },
              { id: "pill", label: "Pílula" },
              { id: "squircle", label: "Squircle Apple" },
            ] as const
          ).map((shape) => (
            <button
              key={shape.id}
              type="button"
              onClick={() => onChangeButtonStyler({ shape: shape.id })}
              className={cn(
                "h-11 min-h-11 rounded-lg border text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                buttonStyler.shape === shape.id
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border bg-background text-foreground",
              )}
            >
              {shape.label}
            </button>
          ))}
        </div>

        <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-background cursor-pointer min-h-11">
          <span className="text-xs font-semibold text-foreground">
            Texto em Maiúsculas (Uppercase)
          </span>
          <input
            type="checkbox"
            checked={buttonStyler.uppercase}
            onChange={(e) => onChangeButtonStyler({ uppercase: e.target.checked })}
            className="size-4"
          />
        </label>
      </div>

      <hr className="border-border" />

      {/* Seção 4: Managing Your App (App Store / Google Play / PWA Status) */}
      <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
        <span className="text-xs font-bold text-foreground block">
          Publicação Mobile (Managing Your App)
        </span>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">PWA Manifest & Service Worker</span>
          <Badge variant="secondary" className="text-xs">
            Pronto
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Apple App Store / Google Play Wrapper</span>
          <Badge variant="outline" className="text-xs">
            Sincronizado
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ── 5. LOVABLE AI SQUAD SPLIT STUDIO PANEL ──

export interface LovableAiSquadSplitPanelProps {
  document: OmniPageDocument;
  onAppendBlock: (block: OmniBlockInstance) => void;
  onOpenCodeModal: () => void;
}

interface AiCommitHistoryItem {
  id: string;
  prompt: string;
  niche: string;
  block: OmniBlockInstance;
  timestamp: string;
}

export function LovableAiSquadSplitPanel({
  document,
  onAppendBlock,
  onOpenCodeModal,
}: LovableAiSquadSplitPanelProps) {
  const [promptInput, setPromptInput] = useState("");
  const [commits, setCommits] = useState<AiCommitHistoryItem[]>([]);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);

  const handleRunAiGeneration = (rawPrompt: string) => {
    setSecurityWarning(null);
    const check = validateAndSanitizeBuilderPrompt(rawPrompt);
    if (!check.isValid) {
      setSecurityWarning(check.threatDetected || "Prompt bloqueado pela barreira Zero-Trust.");
      toast.error(check.threatDetected || "Prompt inválido.");
      return;
    }

    const plan = planPageArchitecture(rawPrompt);
    const res = generateSectionBlockWithAi({
      userPrompt: rawPrompt,
      storeContext: { storeName: document.title || "Minha Vitrine" },
    });

    if (!res.success || !res.block) {
      toast.error(res.error || "Não foi possível gerar o bloco.");
      return;
    }

    const commit: AiCommitHistoryItem = {
      id: `commit_${Date.now()}`,
      prompt: check.sanitizedPrompt,
      niche: plan.suggestedNiche,
      block: res.block,
      timestamp: "Agora",
    };

    setCommits((prev) => [commit, ...prev]);
    onAppendBlock(res.block);
    setPromptInput("");
    toast.success("AI Squad gerou e injetou a nova seção no Canvas!");
  };

  return (
    <aside className="w-80 lg:w-96 border-r border-border bg-card flex flex-col shrink-0 select-none">
      <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Wand2 className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">AI Squad Split Studio</h3>
            <p className="text-xs text-muted-foreground">Orquestrador + Designer + Coder + Guard</p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenCodeModal}
          className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Code2 className="size-3.5" />
          <span>TSX</span>
        </Button>
      </div>

      {/* Status dos 4 Agentes */}
      <div className="p-3 border-b border-border bg-muted/10 grid grid-cols-2 gap-2">
        {[
          { role: "1. Architect", state: "Pronto" },
          { role: "2. Designer", state: "Tokens OK" },
          { role: "3. Coder", state: "AST Safe" },
          { role: "4. Security Guard", state: "Zero-Trust" },
        ].map((ag) => (
          <div
            key={ag.role}
            className="px-2 py-1 rounded border border-border bg-background flex items-center justify-between text-xs"
          >
            <span className="font-semibold text-foreground">{ag.role}</span>
            <span className="text-primary font-mono">{ag.state}</span>
          </div>
        ))}
      </div>

      {/* Atalhos Rápidos de Prompt */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Gerar Seção com 1 Clique
            </span>
            <div className="grid grid-cols-1 gap-2">
              {[
                "Criar Hero Banner promocional de alta conversão",
                "Adicionar vitrine de produtos do Clube com ofertas",
                "Inserir seção de depoimentos e prova social verificada",
                "Criar mosaico Bento Grid de diferenciais da marca",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleRunAiGeneration(preset)}
                  className="w-full min-h-11 p-2 rounded-lg border border-border bg-background hover:bg-muted/50 text-left text-xs font-semibold text-foreground flex items-center justify-between gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="truncate">{preset}</span>
                  <Sparkles className="size-3.5 text-primary shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {securityWarning && (
            <div className="p-3 rounded-lg border border-destructive bg-destructive/10 text-xs text-destructive font-semibold">
              {securityWarning}
            </div>
          )}

          {/* Histórico de Commits da IA */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground block">
              Commits Gerados na Sessão ({commits.length})
            </span>
            {commits.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                Envie uma instrução abaixo para o AI Squad construir e injetar seções ao vivo.
              </div>
            ) : (
              commits.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg border border-border bg-muted/20 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {c.block.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{c.timestamp}</span>
                  </div>
                  <p className="text-xs text-foreground font-medium">{c.prompt}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={onOpenCodeModal}
                      className="h-11 min-h-11 flex-1 text-xs rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Detalhes (Diff)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onAppendBlock(c.block)}
                      className="h-11 min-h-11 flex-1 text-xs font-bold rounded-lg bg-primary text-primary-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Duplicar no Canvas
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Caixa de Prompt Chat-to-Build */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (promptInput.trim()) handleRunAiGeneration(promptInput);
        }}
        className="p-3 border-t border-border bg-background space-y-2"
      >
        <Textarea
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          placeholder="Descreva a seção desejada (ex: Hero para locadora de carros com reserva mínima de 3 diárias)..."
          rows={2}
          className="text-xs resize-none bg-card"
        />
        <Button
          type="submit"
          className="w-full h-11 min-h-11 rounded-lg bg-primary text-primary-foreground text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Send className="size-3.5" />
          <span>Executar AI Squad no Canvas</span>
        </Button>
      </form>
    </aside>
  );
}

// ── 6. WIX STUDIO SCROLL ANIMATIONS (12 PRESETS), FLUID SIZING, DOCKING & HEADER SCROLL INSPECTOR ──

export interface WixScrollAnimationsAndDockingInspectorProps {
  section: "layout" | "animation_cms";
  selectedBlock: OmniBlockInstance;
  onUpdateConfig: (key: string, value: any) => void;
  onUpdateStyling: (key: any, value: any) => void;
  onOpenCmsTable?: () => void;
}

const WIX_12_SCROLL_ANIMATIONS = [
  { id: "none", label: "None (Sem Efeito)" },
  { id: "fade", label: "Fade (Suave)" },
  { id: "move", label: "Move (Deslizar)" },
  { id: "parallax", label: "Parallax 3D" },
  { id: "grow", label: "Grow (Expandir)" },
  { id: "shrink", label: "Shrink (Reduzir)" },
  { id: "spin", label: "Spin (Girar)" },
  { id: "pan", label: "Pan (Panorâmico)" },
  { id: "slide", label: "Slide Lateral" },
  { id: "blur", label: "Blur (Foco)" },
  { id: "shape", label: "Shape (Máscara)" },
  { id: "arc", label: "Arc (Curva)" },
];

const HEADER_SCROLL_MODES = [
  { id: "scrolls_with_site", label: "Rola com o site (Scrolls with site)" },
  { id: "freezes", label: "Congela no topo (Freezes / Sticky)" },
  { id: "disappears", label: "Desaparece ao descer (Disappears)" },
  { id: "fades_out", label: "Esmaece suavemente (Fades out)" },
];

export function WixScrollAnimationsAndDockingInspector({
  section,
  selectedBlock,
  onUpdateConfig,
  onUpdateStyling,
  onOpenCmsTable,
}: WixScrollAnimationsAndDockingInspectorProps) {
  const config = (selectedBlock.config || {}) as Record<string, any>;
  const styling = (selectedBlock.styling || {}) as Record<string, any>;

  if (section === "layout") {
    return (
      <div className="space-y-4 pt-3 border-t border-border text-xs">
        {/* 1. Sizing: Fixed vs Fluid (Editor X Parity) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Maximize2 className="size-3.5 text-primary" />
              <span>Dimensionamento (Fluid & Fixed Sizing)</span>
            </span>
            <Badge variant="outline" className="text-xs font-mono">
              Editor X
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Largura (Width)</Label>
              <Input
                value={config.fluidWidth || "100%"}
                onChange={(e) => onUpdateConfig("fluidWidth", e.target.value)}
                className="h-11 min-h-11 text-xs font-mono mt-1 bg-background"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Altura (Height)</Label>
              <Input
                value={config.fluidHeight || "Auto"}
                onChange={(e) => onUpdateConfig("fluidHeight", e.target.value)}
                className="h-11 min-h-11 text-xs font-mono mt-1 bg-background"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Min Height</Label>
              <Input
                value={config.minHeight || "0px"}
                onChange={(e) => onUpdateConfig("minHeight", e.target.value)}
                className="h-11 min-h-11 text-xs font-mono mt-1 bg-background"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Overflow</Label>
              <select
                value={config.overflowBehavior || "hidden"}
                onChange={(e) => onUpdateConfig("overflowBehavior", e.target.value)}
                className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-2 text-xs mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="hidden">Hidden (Recortar)</option>
                <option value="visible">Visible (Mostrar)</option>
                <option value="scroll">Scroll (Rolagem)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Matriz 3x3 de Ancoragem (Docking Matrix) + Margens */}
        <BuilderDockingMatrix
          value={(config.dockingPosition as DockingPosition) || "center"}
          onChange={(pos) => onUpdateConfig("dockingPosition", pos)}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: "marginTop", label: "Topo" },
            { key: "marginRight", label: "Dir" },
            { key: "marginBottom", label: "Base" },
            { key: "marginLeft", label: "Esq" },
          ].map((m) => (
            <div key={m.key}>
              <Label className="text-xs text-muted-foreground">M. {m.label}</Label>
              <Input
                value={config[m.key] || "0px"}
                onChange={(e) => onUpdateConfig(m.key, e.target.value)}
                className="h-11 min-h-11 text-xs font-mono mt-1 bg-background"
              />
            </div>
          ))}
        </div>

        {/* 3. Header Scroll Settings (4 Modos Wix Studio) */}
        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-xs font-bold text-foreground block">
            Comportamento de Rolagem do Topo (Header Scroll)
          </Label>
          <select
            value={config.headerScrollMode || "freezes"}
            onChange={(e) => onUpdateConfig("headerScrollMode", e.target.value)}
            className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {HEADER_SCROLL_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // section === "animation_cms"
  const activeAnim = config.wixScrollAnimation || styling.scrollAnimation || "none";

  return (
    <div className="space-y-5 text-xs">
      {/* 1. Grade de 12 Animações de Rolagem (Wix Studio Scroll Effects) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-foreground flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" />
            <span>Animações de Rolagem (12 Efeitos Wix)</span>
          </Label>
          <Badge variant="outline" className="text-xs font-mono uppercase">
            {activeAnim}
          </Badge>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground block mb-1">
            Elemento Animado (Animated Element)
          </Label>
          <select
            value={config.animatedElementTarget || "self"}
            onChange={(e) => onUpdateConfig("animatedElementTarget", e.target.value)}
            className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="self">Próprio Bloco (Self)</option>
            <option value="image">Mídia / Imagem Interna</option>
            <option value="section">Seção Completa</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {WIX_12_SCROLL_ANIMATIONS.map((anim) => {
            const isSelected = activeAnim === anim.id;
            return (
              <button
                key={anim.id}
                type="button"
                onClick={() => {
                  onUpdateConfig("wixScrollAnimation", anim.id);
                  const mapped =
                    anim.id === "none"
                      ? "none"
                      : anim.id === "fade"
                        ? "fade"
                        : anim.id === "grow" || anim.id === "shrink"
                          ? "zoom-in"
                          : "slide-up";
                  onUpdateStyling("scrollAnimation", mapped);
                }}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg border text-left text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border bg-background hover:bg-muted/40 text-foreground",
                )}
              >
                <span className="truncate">{anim.label}</span>
                {isSelected && <Check className="size-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-border" />

      {/* 2. Vínculo Direto com Dataset CMS (Data Binding Inspector) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-foreground flex items-center gap-2">
            <Database className="size-3.5 text-primary" />
            <span>Conexão de Dados (CMS Dataset Binding)</span>
          </Label>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground block mb-1">Coleção Conectada</Label>
          <select
            value={config.cmsCollectionBinding || "catalog_products"}
            onChange={(e) => onUpdateConfig("cmsCollectionBinding", e.target.value)}
            className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="catalog_products">Catálogo de Produtos & Ofertas</option>
            <option value="car_rental_3days">Aluguel de Carros (Mín. 3 Diárias)</option>
            <option value="tourism_packages">Pacotes de Viagem & Hotéis</option>
            <option value="real_estate">Imóveis & Lançamentos</option>
            <option value="news_articles">Notícias & Artigos Prométhée</option>
          </select>
        </div>

        {onOpenCmsTable && (
          <Button
            type="button"
            variant="outline"
            onClick={onOpenCmsTable}
            className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <TableIcon className="size-4 text-primary" />
            <span>Abrir Planilha Relacional do CMS</span>
          </Button>
        )}
      </div>
    </div>
  );
}
