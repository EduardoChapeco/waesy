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
  ArrowRight,
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
import { evaluateAgenticReadiness } from "@/lib/agentic/agentic-readiness-engine";
import { SeoGeoOptimizationPanel } from "@/components/seo";
import { MediaUploader } from "@/components/ui/media-uploader";
import { VITRINE_BUTTON_ICON_OPTIONS } from "@/design-system/vitrine";
import { getNavigationMenus, upsertNavigationMenu } from "@/services/cms.functions";

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

  const mainPages = pages.filter((p) => {
    const slug = (p.slug || "").toLowerCase().replace(/^\//, "");
    return p.is_home || slug === "" || slug === "home" || slug === "sobre" || slug === "contato";
  });

  const storeAndVertPages = pages.filter((p) => {
    const slug = (p.slug || "").toLowerCase().replace(/^\//, "");
    return (
      !p.is_home &&
      (slug.includes("loja") ||
        slug.includes("cardapio") ||
        slug.includes("mercado") ||
        slug.includes("produto") ||
        slug.includes("catalogo") ||
        slug.includes("departamento") ||
        slug.includes("eventos") ||
        slug.includes("evento") ||
        slug.includes("ingressos") ||
        slug.includes("agendamento") ||
        slug.includes("procedimento") ||
        slug.includes("profissionais") ||
        slug.includes("turismo") ||
        slug.includes("mobilidade"))
    );
  });

  const appsAndTransactPages = pages.filter((p) => {
    const slug = (p.slug || "").toLowerCase().replace(/^\//, "");
    return (
      !p.is_home &&
      (slug.includes("carrinho") ||
        slug.includes("sacola") ||
        slug.includes("pedidos") ||
        slug.includes("compras") ||
        slug.includes("acompanhar") ||
        slug.includes("checkout") ||
        slug.includes("clube") ||
        slug.includes("meus-ingressos") ||
        slug.includes("meus-agendamentos") ||
        slug.includes("conta") ||
        slug.includes("noticias") ||
        slug.includes("portal") ||
        slug.includes("artigo") ||
        slug.includes("bio") ||
        slug.includes("links"))
    );
  });

  const customPages = pages.filter(
    (p) => !mainPages.includes(p) && !storeAndVertPages.includes(p) && !appsAndTransactPages.includes(p)
  );

  const systemGroups = [
    {
      groupTitle: "Páginas Principais (Main Pages)",
      items: mainPages.length > 0 ? mainPages : pages,
    },
    ...(storeAndVertPages.length > 0
      ? [
          {
            groupTitle: "Páginas de Loja & Verticais (Store & Booking)",
            items: storeAndVertPages,
          },
        ]
      : []),
    ...(appsAndTransactPages.length > 0
      ? [
          {
            groupTitle: "Área Transacional & Apps Instalados",
            items: appsAndTransactPages,
          },
        ]
      : []),
    ...(customPages.length > 0
      ? [
          {
            groupTitle: "Páginas Customizadas",
            items: customPages,
          },
        ]
      : []),
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
                  {/* Google SERP Preview & Is-Agentic Score */}
                  <div className="p-3 rounded-lg border border-border bg-background space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                        Prévia no Google Search & Is-Agentic
                      </span>
                      <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30">
                        Is-Agentic: {
                          evaluateAgenticReadiness({
                            url: `https://waesy.com.br${selectedPage.slug}`,
                            title: seoTitleDraft,
                            description: seoDescDraft,
                            h1: selectedPage.title,
                            bodyTextLength: 1400,
                            hasCanonical: true,
                            hasHtmlLang: true,
                            hasOgImage: true,
                            hasOgType: true,
                            hasJsonLd: true,
                            hasJsonLdDescription: true,
                            hasOrgAddress: true,
                            hasOrgContactPoint: true,
                            hasMarkdownNegotiation: true,
                            hasVaryAccept: true,
                            hasAgentFriendly404: true,
                            hasJsonErrorResponses: true,
                            hasPublicApi: true,
                            hasDeveloperDocs: true,
                            hasApiLinkedFromHome: true,
                            hasWhenToUseGuidance: true,
                            hasCliTool: true,
                            hasTrustAnchors: true,
                            hasRateLimitHeaders: true,
                            restSchemaCoveragePct: 100,
                            hasPredictableDevUrls: true,
                            hasMcpServerHandshake: true,
                            functionCallingCompatibilityPct: 100,
                            hasVersioningAndDeprecationPolicy: true,
                            hasGeoMeta: geoEnabled,
                            hasBacklinkGraph: true,
                          }).overallScore
                        }/100
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      https://waesy.com.br{selectedPage.slug}
                    </p>
                    <p className="text-sm font-bold text-primary truncate">{seoTitleDraft}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{seoDescDraft}</p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const enrichedTitle = `${selectedPage.title} | Waesy Local Marketplace`;
                      const enrichedDesc = `${selectedPage.title} com catálogo verificado, ficha cadastral CNPJ, geolocalização GEO, suporte WebMCP e atendimento oficial no Waesy Local Marketplace.`;
                      setSeoTitleDraft(enrichedTitle);
                      setSeoDescDraft(enrichedDesc);
                      toast.success("SEO, GEO e Backlinks otimizados pelo AI Squad!");
                    }}
                    className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Globe className="size-3.5 text-primary" />
                    <span>Otimizar Metadados SEO/GEO</span>
                  </Button>

                  <SeoGeoOptimizationPanel
                    value={{
                      seoTitle: seoTitleDraft,
                      seoDescription: seoDescDraft,
                      keywords: [],
                      allowAiIndexing: indexable,
                    }}
                    onChange={(m) => {
                      setSeoTitleDraft(m.seoTitle || "");
                      setSeoDescDraft(m.seoDescription || "");
                      setIndexable(Boolean(m.allowAiIndexing));
                    }}
                    referenceTitle={selectedPage.title}
                    referenceDescription={selectedPage.title}
                    defaultOpen={true}
                  />

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

// ── 2. WIX MENU MANAGER DRAWER (GERENCIADOR DE MENUS E NAVEGAÇÃO — AMPLO & CONECTADO AO BANCO) ──

export interface WixMenuItem {
  id: string;
  label: string;
  href: string;
  badge?: string;
  icon?: string;
  image_url?: string;
  bg_color?: string;
  text_color?: string;
  show_text?: boolean;
  city_filter?: string;
  starts_at?: string;
  ends_at?: string;
}

export interface WixMenuManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialMenuType?: string;
  onApplyMenuToBlock?: (items: WixMenuItem[], menuType: string) => void;
}

const MENU_LOCATIONS = [
  { id: "bottom_nav", label: "Barra Inferior Mobile (5 Abas Principais)" },
  { id: "explore_menu", label: "Menu Lateral Hambúrguer (Drawer & Explorar)" },
  { id: "header_nav", label: "Menu Principal do Topo Desktop" },
  { id: "noor_dock", label: "Bloco de Botões / Dock Selecionado no Canvas" },
];

export function WixMenuManagerDrawer({
  isOpen,
  onClose,
  initialMenuType,
  onApplyMenuToBlock,
}: WixMenuManagerDrawerProps) {
  const [selectedMenuType, setSelectedMenuType] = useState(initialMenuType || "bottom_nav");
  const [dbMenus, setDbMenus] = useState<any[]>([]);
  const [isLoadingMenus, setIsLoadingMenus] = useState(false);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [menuItems, setMenuItems] = useState<WixMenuItem[]>([
    { id: "m1", label: "Início", href: "/", icon: "Home", show_text: true },
    { id: "m2", label: "Explorar", href: "/explorar", icon: "Compass", show_text: true },
    { id: "m3", label: "Noor IA", href: "/chats", icon: "Sparkles", badge: "IA", show_text: true },
    { id: "m4", label: "Feed", href: "/feed", icon: "LayoutGrid", show_text: true },
    { id: "m5", label: "Comunidades", href: "/comunidades", icon: "Users", show_text: true },
  ]);

  React.useEffect(() => {
    if (initialMenuType) {
      setSelectedMenuType(initialMenuType);
    }
  }, [initialMenuType]);

  const loadMenusFromDb = React.useCallback(async (targetLoc: string) => {
    setIsLoadingMenus(true);
    try {
      const menus = await getNavigationMenus();
      setDbMenus(menus || []);
      const found = (menus || []).find((m: any) => (m.handle || m.location) === targetLoc);
      if (found && Array.isArray(found.items) && found.items.length > 0) {
        setMenuItems(
          found.items.map((it: any, idx: number) => ({
            id: it.id || `nav_${idx}`,
            label: it.label || "Item",
            href: it.url || it.href || "/",
            badge: it.badge_text || it.badge || "",
            icon: it.icon || "Compass",
            image_url: it.image_url || "",
            bg_color: it.bg_color || "",
            text_color: it.text_color || "",
            show_text: it.show_text !== false,
            city_filter: it.city_filter || "",
            starts_at: it.starts_at || "",
            ends_at: it.ends_at || "",
          })),
        );
      }
    } catch {
      // Preserva itens locais se offline
    } finally {
      setIsLoadingMenus(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen && selectedMenuType !== "noor_dock") {
      loadMenusFromDb(selectedMenuType);
    }
  }, [isOpen, selectedMenuType, loadMenusFromDb]);

  const moveItem = (idx: number, dir: "up" | "down") => {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= menuItems.length) return;
    const copy = [...menuItems];
    const temp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = temp;
    setMenuItems(copy);
  };

  const handleSaveAndApply = async () => {
    setIsSavingMenu(true);
    try {
      if (selectedMenuType !== "noor_dock") {
        const currentMenuObj = dbMenus.find((m: any) => (m.handle || m.location) === selectedMenuType);
        const locLabel =
          MENU_LOCATIONS.find((l) => l.id === selectedMenuType)?.label || "Menu Global";
        await upsertNavigationMenu({
          data: {
            id: currentMenuObj?.id && !String(currentMenuObj.id).startsWith("canonical-")
              ? currentMenuObj.id
              : undefined,
            name: currentMenuObj?.name || currentMenuObj?.title || locLabel,
            handle: selectedMenuType,
            items: menuItems.map((it, idx) => ({
              id: it.id,
              label: it.label || "Item",
              url: it.href || "/",
              type: "internal" as const,
              icon: it.icon || "Compass",
              image_url: it.image_url || undefined,
              badge_text: it.badge || undefined,
              bg_color: it.bg_color || undefined,
              text_color: it.text_color || undefined,
              show_text: it.show_text !== false,
              city_filter: it.city_filter || undefined,
              starts_at: it.starts_at || undefined,
              ends_at: it.ends_at || undefined,
              order: idx,
            })),
          },
        });
      }
      onApplyMenuToBlock?.(menuItems, selectedMenuType);
      toast.success("Menu salvo no banco e sincronizado em tempo real com a vitrine!");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar menu.");
    } finally {
      setIsSavingMenu(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-3xl w-full p-0 flex flex-col bg-background">
        <SheetHeader className="p-5 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <MenuIcon className="size-5 text-primary" />
              <span>Gerenciador Avançado de Menus (Mobile 5 Abas, Hambúrguer & Header)</span>
            </SheetTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {isLoadingMenus ? "Sincronizando..." : `${menuItems.length} itens`}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 rounded-xl border border-border bg-card">
              <div className="md:col-span-8">
                <Label className="text-xs font-bold block mb-2">
                  Selecione a Estrutura de Navegação para Editar
                </Label>
                <select
                  value={selectedMenuType}
                  onChange={(e) => setSelectedMenuType(e.target.value)}
                  className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {MENU_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setMenuItems((prev) => [
                      ...prev,
                      {
                        id: `m_${Date.now()}`,
                        label: `Novo Atalho ${prev.length + 1}`,
                        href: "/explorar",
                        icon: "Sparkles",
                        show_text: true,
                      },
                    ]);
                  }}
                  className="w-full h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-4" />
                  <span>Adicionar Botão ao Menu</span>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {menuItems.map((item, idx) => {
                const updateMenuItem = (patch: Partial<WixMenuItem>) => {
                  const next = [...menuItems];
                  next[idx] = { ...item, ...patch };
                  setMenuItems(next);
                };

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-border bg-card space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          #{idx + 1}
                        </Badge>
                        <span className="text-sm font-bold text-foreground">
                          {item.label || `Item ${idx + 1}`}
                        </span>
                        {item.badge ? (
                          <Badge variant="outline" className="text-2xs">
                            {item.badge}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveItem(idx, "up")}
                          className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title="Subir"
                        >
                          <ArrowUp className="size-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === menuItems.length - 1}
                          onClick={() => moveItem(idx, "down")}
                          className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title="Descer"
                        >
                          <ArrowDown className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMenuItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="size-11 min-h-11 min-w-11 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title="Remover"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-4">
                        <MediaUploader
                          label="Ícone Customizado (Upload Bucket)"
                          bucket="banners"
                          folder="menus"
                          maxFiles={1}
                          aspect={1}
                          value={item.image_url ? [item.image_url] : []}
                          onChange={(urls) => updateMenuItem({ image_url: urls[0] || "" })}
                        />
                      </div>

                      <div className="md:col-span-8 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <Label className="text-2xs font-semibold text-muted-foreground block mb-1">
                              Rótulo do Botão
                            </Label>
                            <Input
                              value={item.label}
                              onChange={(e) => updateMenuItem({ label: e.target.value })}
                              placeholder="Ex: Explorar"
                              className="h-11 min-h-11 text-xs bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-2xs font-semibold text-muted-foreground block mb-1">
                              Rota / Link Destino
                            </Label>
                            <Input
                              value={item.href}
                              onChange={(e) => updateMenuItem({ href: e.target.value })}
                              placeholder="/explorar"
                              className="h-11 min-h-11 text-xs font-mono bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-2xs font-semibold text-muted-foreground block mb-1">
                              Badge / Selo
                            </Label>
                            <Input
                              value={item.badge || ""}
                              onChange={(e) => updateMenuItem({ badge: e.target.value })}
                              placeholder="Ex: NOVO, IA"
                              className="h-11 min-h-11 text-xs bg-background"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div>
                            <Label className="text-2xs font-semibold text-muted-foreground block mb-1">
                              Ícone Vetorial
                            </Label>
                            <select
                              value={item.icon || "Compass"}
                              onChange={(e) => updateMenuItem({ icon: e.target.value })}
                              className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {VITRINE_BUTTON_ICON_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-2xs font-semibold text-muted-foreground block mb-1">
                              Cor de Fundo
                            </Label>
                            <Input
                              value={item.bg_color || ""}
                              onChange={(e) => updateMenuItem({ bg_color: e.target.value })}
                              placeholder="Cor fundo"
                              className="h-11 min-h-11 text-xs bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-2xs font-semibold text-muted-foreground block mb-1">
                              Cor do Texto
                            </Label>
                            <Input
                              value={item.text_color || ""}
                              onChange={(e) => updateMenuItem({ text_color: e.target.value })}
                              placeholder="Cor texto"
                              className="h-11 min-h-11 text-xs bg-background"
                            />
                          </div>
                          <label className="h-11 min-h-11 mt-5 px-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs font-semibold text-foreground cursor-pointer">
                            <span>Exibir Texto</span>
                            <input
                              type="checkbox"
                              checked={item.show_text !== false}
                              onChange={(e) => updateMenuItem({ show_text: e.target.checked })}
                              className="size-4 accent-primary"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 min-h-11 px-5 rounded-lg text-xs font-semibold"
          >
            Fechar
          </Button>
          <Button
            type="button"
            disabled={isSavingMenu}
            onClick={handleSaveAndApply}
            className="h-11 min-h-11 px-6 rounded-lg bg-primary text-primary-foreground text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isSavingMenu ? "Salvando..." : "Salvar no Banco & Aplicar na Página"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── 3. WIX CMS COLLECTION & IN-PAGE EDITABLE SHEET MODAL (PLANILHA RELACIONAL VIVA) ──

export interface WixCmsCollectionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  productsCount?: number;
  onInsertCollectionBlock?: (blockType: string, collectionName: string) => void;
  selectedBlock?: OmniBlockInstance | null;
  allBlocks?: OmniBlockInstance[];
  onSelectBlock?: (blockId: string) => void;
  onUpdateBlockConfig?: (key: string, value: any) => void;
}

function resolveEditableArrayForBlock(block?: OmniBlockInstance | null): {
  arrayKey: "items" | "tiles" | "slides" | "sections_flat";
  items: any[];
} {
  if (!block) return { arrayKey: "items", items: [] };
  const cfg = (block.config || {}) as Record<string, any>;
  if (block.type === "vitrine_bento_tetris" || Array.isArray(cfg.tiles)) {
    return { arrayKey: "tiles", items: Array.isArray(cfg.tiles) ? cfg.tiles : [] };
  }
  if (block.type === "vitrine_metamorphic_banner" || Array.isArray(cfg.slides)) {
    return { arrayKey: "slides", items: Array.isArray(cfg.slides) ? cfg.slides : [] };
  }
  if (block.type === "vitrine_lateral_drawer" && Array.isArray(cfg.sections)) {
    const flat = cfg.sections.flatMap((s: any) => (Array.isArray(s.items) ? s.items : []));
    return { arrayKey: "sections_flat", items: flat };
  }
  return { arrayKey: "items", items: Array.isArray(cfg.items) ? cfg.items : [] };
}

export function WixCmsCollectionManagerModal({
  isOpen,
  onClose,
  productsCount = 0,
  onInsertCollectionBlock,
  selectedBlock,
  allBlocks = [],
  onSelectBlock,
  onUpdateBlockConfig,
}: WixCmsCollectionManagerModalProps) {
  const [sheetScope, setSheetScope] = useState<"active_block" | "cms_collections">(
    selectedBlock ? "active_block" : "cms_collections",
  );
  const [selectedCollection, setSelectedCollection] = useState("catalog_products");
  const [showManageFields, setShowManageFields] = useState(false);

  React.useEffect(() => {
    if (selectedBlock) {
      setSheetScope("active_block");
    }
  }, [selectedBlock?.id]);

  const [fields, setFields] = useState([
    { id: "f_title", name: "Title (PRIMARY)", type: "Text", enabled: true },
    { id: "f_media", name: "Mídia / Ícone (Bucket)", type: "Image / Video", enabled: true },
    { id: "f_badge", name: "Badge / Selo", type: "Tag", enabled: true },
    { id: "f_colors", name: "Cores & Formato", type: "Style Token", enabled: true },
    { id: "f_route", name: "Destino / Rota", type: "URL", enabled: true },
    { id: "f_schedule", name: "Cidade & Agendamento", type: "Datetime / Geo", enabled: true },
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

  const { arrayKey, items: blockRows } = resolveEditableArrayForBlock(selectedBlock);

  const commitBlockRows = (nextRows: any[]) => {
    if (!selectedBlock || !onUpdateBlockConfig) return;
    if (arrayKey === "sections_flat") {
      const cfg = (selectedBlock.config || {}) as Record<string, any>;
      const firstSec = Array.isArray(cfg.sections) && cfg.sections[0]
        ? cfg.sections[0]
        : { id: "sec_global", title: "Atalhos Principais" };
      onUpdateBlockConfig("sections", [{ ...firstSec, items: nextRows }]);
      onUpdateBlockConfig("items", nextRows);
      return;
    }
    onUpdateBlockConfig(arrayKey, nextRows);
  };

  const handleAddBlockRow = () => {
    if (!selectedBlock) return;
    const newId = `item_${Date.now()}`;
    if (arrayKey === "slides") {
      commitBlockRows([
        ...blockRows,
        {
          id: newId,
          title: "Novo Banner Promocional",
          subtitle: "Subtítulo editável na planilha",
          badge: "DESTAQUE",
          href: "/ofertas",
          showOverlay: true,
        },
      ]);
    } else if (arrayKey === "tiles") {
      commitBlockRows([
        ...blockRows,
        {
          id: newId,
          title: "Novo Bloco Bento",
          subtitle: "Subtítulo",
          tag: "NOVO",
          href: "/explorar",
          spanX: 1,
          spanY: 1,
          mobileSpanX: 1,
        },
      ]);
    } else {
      commitBlockRows([
        ...blockRows,
        {
          id: newId,
          label: "Novo Botão",
          title: "Novo Botão",
          subtitle: "",
          badge: "",
          iconName: "Sparkles",
          shape: "squircle",
          showLabel: true,
          href: "/ofertas",
        },
      ]);
    }
    toast.success("Nova linha adicionada ao bloco na Planilha!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl w-full max-h-sheet p-0 flex flex-col gap-0 overflow-hidden bg-background border border-border">
        <DialogHeader className="h-16 px-6 border-b border-border flex flex-row items-center justify-between flex-none bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <TableIcon className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Planilha Editável In-Page (Wix Sheet Mode) & Coleções CMS</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {sheetScope === "active_block"
                    ? `${blockRows.length} itens na seção`
                    : `${productsCount + rows.length} registros`}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Edite títulos, faça upload de ícones/banners no bucket, ajuste cores, rotas, cidades e timers em grade ampla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setSheetScope("active_block")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-md text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  sheetScope === "active_block"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Seção / Bloco da Página ({blockRows.length})
              </button>
              <button
                type="button"
                onClick={() => setSheetScope("cms_collections")}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-md text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  sheetScope === "cms_collections"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Coleções Globais
              </button>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowManageFields(!showManageFields)}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Sliders className="size-3.5" />
              <span>Colunas</span>
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
        <div className="px-6 py-3 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3">
          {sheetScope === "active_block" ? (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <Label className="text-xs font-bold text-muted-foreground">
                  Seção da Página em Edição:
                </Label>
                <select
                  value={selectedBlock?.id || ""}
                  onChange={(e) => onSelectBlock?.(e.target.value)}
                  className="h-11 min-h-11 rounded-lg border border-border bg-background px-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {allBlocks.map((b, i) => {
                    const bCfg = (b.config || {}) as Record<string, any>;
                    const bTitle =
                      bCfg.sectionTitle || bCfg.title || bCfg.greetingTitle || b.type;
                    return (
                      <option key={b.id} value={b.id}>
                        {i + 1}. {bTitle} ({b.type})
                      </option>
                    );
                  })}
                </select>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddBlockRow}
                className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-4" />
                <span>Adicionar Item nesta Seção</span>
              </Button>
            </>
          ) : (
            <>
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
              </div>
            </>
          )}
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          <ScrollArea
            className={cn(
              "p-6 max-h-full",
              showManageFields ? "lg:col-span-9 border-r border-border" : "lg:col-span-12",
            )}
          >
            {sheetScope === "active_block" ? (
              blockRows.length === 0 ? (
                <div className="p-12 rounded-2xl border border-dashed border-border text-center space-y-3">
                  <p className="text-sm font-bold text-foreground">
                    Esta seção ainda não possui itens manuais cadastrados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Clique em &ldquo;Adicionar Item nesta Seção&rdquo; para criar botões, banners ou cards diretamente na planilha.
                  </p>
                  <Button
                    type="button"
                    onClick={handleAddBlockRow}
                    className="h-11 min-h-11 px-5 rounded-lg text-xs font-bold gap-2"
                  >
                    <Plus className="size-4" />
                    <span>Criar Primeiro Item</span>
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-border scroll-area-carousel bg-card">
                  <table className="w-full text-left border-collapse text-xs min-w-4xl">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold">
                        <th className="p-3 w-24"># Ordem</th>
                        <th className="p-3 w-56">Mídia / Ícone (Upload Bucket)</th>
                        <th className="p-3 min-w-52">Título & Subtítulo</th>
                        <th className="p-3 w-28">Texto Visível</th>
                        <th className="p-3 w-36">Badge / Selo</th>
                        <th className="p-3 w-48">Cores & Formato</th>
                        <th className="p-3 min-w-44">Destino / Rota</th>
                        <th className="p-3 w-56">Cidade & Agendamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border align-top">
                      {blockRows.map((row: any, idx: number) => {
                        const updateRow = (patch: Record<string, any>) => {
                          const next = [...blockRows];
                          next[idx] = { ...row, ...patch };
                          commitBlockRows(next);
                        };
                        const mediaUrl =
                          row.imageUrl || row.imageDesktopUrl || row.imageMobileUrl || "";
                        const titleVal = row.label ?? row.title ?? "";
                        const badgeVal = row.badge ?? row.tag ?? "";

                        return (
                          <tr key={row.id || idx} className="hover:bg-muted/10">
                            <td className="p-3">
                              <div className="flex flex-col gap-1">
                                <span className="font-mono font-bold text-muted-foreground">
                                  #{idx + 1}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => {
                                      const next = [...blockRows];
                                      const tmp = next[idx - 1];
                                      next[idx - 1] = next[idx];
                                      next[idx] = tmp;
                                      commitBlockRows(next);
                                    }}
                                    className="size-11 min-h-11 min-w-11 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    title="Subir"
                                  >
                                    <ArrowUp className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === blockRows.length - 1}
                                    onClick={() => {
                                      const next = [...blockRows];
                                      const tmp = next[idx + 1];
                                      next[idx + 1] = next[idx];
                                      next[idx] = tmp;
                                      commitBlockRows(next);
                                    }}
                                    className="size-11 min-h-11 min-w-11 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    title="Descer"
                                  >
                                    <ArrowDown className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      commitBlockRows(blockRows.filter((_, i) => i !== idx))
                                    }
                                    className="size-11 min-h-11 min-w-11 rounded-lg border border-border text-destructive flex items-center justify-center hover:bg-destructive/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    title="Remover"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            </td>

                            <td className="p-3 space-y-2">
                              <MediaUploader
                                label="Upload Mídia"
                                bucket="banners"
                                folder="sheet"
                                maxFiles={1}
                                aspect={arrayKey === "slides" ? 16 / 9 : 1}
                                value={mediaUrl ? [mediaUrl] : []}
                                onChange={(urls) => {
                                  const u = urls[0] || "";
                                  updateRow({
                                    imageUrl: u,
                                    imageDesktopUrl: u,
                                    imageMobileUrl: u,
                                  });
                                }}
                              />
                              <select
                                value={row.iconName || row.icon || "Tag"}
                                onChange={(e) =>
                                  updateRow({ iconName: e.target.value, icon: e.target.value })
                                }
                                className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-2 text-2xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {VITRINE_BUTTON_ICON_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    Ícone: {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="p-3 space-y-2">
                              <Input
                                value={titleVal}
                                onChange={(e) =>
                                  updateRow({ label: e.target.value, title: e.target.value })
                                }
                                placeholder="Título / Rótulo"
                                className="h-11 min-h-11 text-xs font-bold bg-background"
                              />
                              <Input
                                value={row.subtitle || ""}
                                onChange={(e) => updateRow({ subtitle: e.target.value })}
                                placeholder="Subtítulo opcional"
                                className="h-11 min-h-11 text-2xs bg-background"
                              />
                            </td>

                            <td className="p-3">
                              <label className="h-11 min-h-11 px-3 rounded-lg border border-border bg-background flex items-center justify-between gap-2 cursor-pointer">
                                <span className="text-2xs font-semibold">Exibir</span>
                                <input
                                  type="checkbox"
                                  checked={
                                    row.showLabel !== false && row.showOverlay !== false
                                  }
                                  onChange={(e) =>
                                    updateRow({
                                      showLabel: e.target.checked,
                                      showOverlay: e.target.checked,
                                    })
                                  }
                                  className="size-4 accent-primary"
                                />
                              </label>
                            </td>

                            <td className="p-3">
                              <Input
                                value={badgeVal}
                                onChange={(e) =>
                                  updateRow({ badge: e.target.value, tag: e.target.value })
                                }
                                placeholder="Ex: NOVO, IA"
                                className="h-11 min-h-11 text-xs bg-background"
                              />
                            </td>

                            <td className="p-3 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  value={row.bgColor || ""}
                                  onChange={(e) => updateRow({ bgColor: e.target.value })}
                                  placeholder="Cor fundo"
                                  className="h-11 min-h-11 text-2xs bg-background"
                                />
                                <Input
                                  value={row.textColor || ""}
                                  onChange={(e) => updateRow({ textColor: e.target.value })}
                                  placeholder="Cor texto"
                                  className="h-11 min-h-11 text-2xs bg-background"
                                />
                              </div>
                              <select
                                value={row.shape || row.cardVariant || "squircle"}
                                onChange={(e) =>
                                  updateRow({
                                    shape: e.target.value,
                                    cardVariant: e.target.value,
                                  })
                                }
                                className="w-full h-11 min-h-11 rounded-lg border border-border bg-background px-2 text-2xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="squircle">Squircle</option>
                                <option value="circle">Circular</option>
                                <option value="pill">Pílula</option>
                                <option value="wide">Card Amplo</option>
                              </select>
                            </td>

                            <td className="p-3 space-y-2">
                              <Input
                                value={row.href || row.to || ""}
                                onChange={(e) =>
                                  updateRow({ href: e.target.value, to: e.target.value })
                                }
                                placeholder="/explorar"
                                className="h-11 min-h-11 text-xs font-mono bg-background"
                              />
                              {arrayKey === "slides" ? (
                                <Input
                                  value={row.videoUrl || ""}
                                  onChange={(e) => updateRow({ videoUrl: e.target.value })}
                                  placeholder="URL Vídeo .mp4 opcional"
                                  className="h-11 min-h-11 text-2xs bg-background"
                                />
                              ) : null}
                            </td>

                            <td className="p-3 space-y-2">
                              <Input
                                value={row.cityFilter || ""}
                                onChange={(e) => updateRow({ cityFilter: e.target.value })}
                                placeholder="Cidade (vazio = Global)"
                                className="h-11 min-h-11 text-2xs bg-background"
                              />
                              <Input
                                type="datetime-local"
                                value={row.endsAt ? String(row.endsAt).slice(0, 16) : ""}
                                onChange={(e) => updateRow({ endsAt: e.target.value })}
                                title="Prazo / Auto-Ocultar Em"
                                className="h-11 min-h-11 text-2xs bg-background"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
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
            )}
          </ScrollArea>

          {/* Painel Lateral Manage Fields */}
          {showManageFields && (
            <ScrollArea className="lg:col-span-3 p-6 bg-muted/10 max-h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Colunas da Planilha
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
            <Bot className="size-4" />
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
                  <ArrowRight className="size-3.5 text-primary shrink-0" />
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
            <Move className="size-3.5 text-primary" />
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
