import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Smartphone,
  Palette,
  Upload,
  CheckCircle2,
  ExternalLink,
  Layers,
  Share2,
  Play,
  Download,
  BarChart3,
  ShieldCheck,
  Eye,
  RefreshCw,
  ShoppingBag,
  Sliders,
  Globe,
  Bell,
  Search,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  getStorePwaConfig,
  saveStorePwaConfig,
  getPwaTelemetryMetrics,
  getStoreAppCatalogPreview,
} from "@/services/pwa.functions";
import { MobileBottomNav } from "@/components/pwa/MobileBottomNav";
import { AppHomeFeed } from "@/components/pwa/AppHomeFeed";
import { CategoryGrid } from "@/components/pwa/CategoryGrid";
import { QuickCheckoutButton } from "@/components/pwa/QuickCheckoutButton";
import { PwaSplashPreview } from "@/components/pwa/PwaSplashPreview";
import { PwaLegalDisclaimer } from "@/components/pwa/PwaLegalDisclaimer";

export const Route = createFileRoute("/workspace/configuracoes/pwa")({
  head: () => ({ meta: [{ title: "Construtor de App PWA | Workspace Waesy" }] }),
  component: PwaOmniBuilderPage,
});

function PwaOmniBuilderPage() {
  const queryClient = useQueryClient();

  // Aba principal de navegação
  const [activeMainTab, setActiveMainTab] = useState<"builder" | "manifest" | "telemetry" | "governance">("builder");

  // Configurações do Manifesto
  const [appName, setAppName] = useState("Meu Negócio");
  const [shortName, setShortName] = useState("App");
  const [description, setDescription] = useState("");
  const [themeColor, setThemeColor] = useState("#0F172A");
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [icon192Url, setIcon192Url] = useState<string | null>(null);
  const [icon512Url, setIcon512Url] = useState<string | null>(null);
  const [splashImageUrl, setSplashImageUrl] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"standalone" | "fullscreen" | "minimal-ui" | "browser">("standalone");
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | "any">("portrait");
  const [startUrl, setStartUrl] = useState("/");
  const [customDomain, setCustomDomain] = useState("");

  // Configurações visuais do App Builder (armazenadas em settings JSONB)
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [showStoriesReel, setShowStoriesReel] = useState(true);
  const [showPromoBanner, setShowPromoBanner] = useState(true);
  const [bannerTitle, setBannerTitle] = useState("Novidades Exclusivas no App");
  const [bannerSubtitle, setBannerSubtitle] = useState("Aproveite condições especiais e entregas rápidas na sua cidade.");
  const [showCategoryGrid, setShowCategoryGrid] = useState(true);
  const [showQuickCheckout, setShowQuickCheckout] = useState(true);
  const [quickCheckoutLabel, setQuickCheckoutLabel] = useState("Finalizar Pedido");
  const [splashAnimation, setSplashAnimation] = useState<"pulse" | "bounce" | "fade">("pulse");

  // Estado interativo do simulador de smartphone
  const [phoneActiveTab, setPhoneActiveTab] = useState("home");
  const [phoneDeviceType, setPhoneDeviceType] = useState<"iphone" | "android">("iphone");
  const [phonePreviewScreen, setPhonePreviewScreen] = useState<"app" | "splash">("app");

  // Termos Legais
  const [legalAccepted, setLegalAccepted] = useState(true);

  // Queries
  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ["store-pwa-config"],
    queryFn: () => getStorePwaConfig(),
  });

  const { data: telemetry, isLoading: isTelemetryLoading } = useQuery({
    queryKey: ["pwa-telemetry-metrics"],
    queryFn: () => getPwaTelemetryMetrics(),
  });

  const { data: catalogProducts = [] } = useQuery({
    queryKey: ["store-app-catalog-preview"],
    queryFn: () => getStoreAppCatalogPreview(),
  });

  // Preencher estados a partir do config carregado
  useEffect(() => {
    if (config) {
      setAppName(config.app_name || "Meu Negócio");
      setShortName(config.short_name || "App");
      setDescription(config.description || "");
      setThemeColor(config.theme_color || "#0F172A");
      setBackgroundColor(config.background_color || "#000000");
      setIcon192Url(config.icon_192_url || null);
      setIcon512Url(config.icon_512_url || null);
      setSplashImageUrl(config.splash_image_url || null);
      setDisplayMode(config.display_mode || "standalone");
      setOrientation(config.orientation || "portrait");
      setStartUrl(config.start_url || "/");
      setCustomDomain(config.custom_domain || "");

      const s = config.settings || {};
      if (s.showBottomNav !== undefined) setShowBottomNav(s.showBottomNav);
      if (s.showStoriesReel !== undefined) setShowStoriesReel(s.showStoriesReel);
      if (s.showPromoBanner !== undefined) setShowPromoBanner(s.showPromoBanner);
      if (s.bannerTitle) setBannerTitle(s.bannerTitle);
      if (s.bannerSubtitle) setBannerSubtitle(s.bannerSubtitle);
      if (s.showCategoryGrid !== undefined) setShowCategoryGrid(s.showCategoryGrid);
      if (s.showQuickCheckout !== undefined) setShowQuickCheckout(s.showQuickCheckout);
      if (s.quickCheckoutLabel) setQuickCheckoutLabel(s.quickCheckoutLabel);
      if (s.splashAnimation) setSplashAnimation(s.splashAnimation);
    }
  }, [config]);

  // Mutação para salvar configurações
  const saveMutation = useMutation({
    mutationFn: () =>
      saveStorePwaConfig({
        data: {
          appName,
          shortName,
          description: description || undefined,
          themeColor,
          backgroundColor,
          icon192Url: icon192Url || null,
          icon512Url: icon512Url || null,
          splashImageUrl: splashImageUrl || null,
          startUrl,
          displayMode,
          orientation,
          customDomain: customDomain.trim() || null,
          isPublished: true,
          settings: {
            showBottomNav,
            showStoriesReel,
            showPromoBanner,
            bannerTitle,
            bannerSubtitle,
            showCategoryGrid,
            showQuickCheckout,
            quickCheckoutLabel,
            splashAnimation,
            lastEditedAt: new Date().toISOString(),
          },
        },
      }),
    onSuccess: () => {
      toast.success("Aplicativo PWA atualizado e publicado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["store-pwa-config"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao salvar aplicativo PWA.");
    },
  });

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 max-w-7xl mx-auto pb-24 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Construtor de Aplicativo PWA"
          description="Personalize a experiência nativa do seu app, navegação inferior, blocos da Home e monitore instalações reais."
        />

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-semibold text-xs border-border gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>PWA Whitelabel Ativo</span>
          </Badge>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="min-h-11 rounded-lg font-bold bg-primary text-primary-foreground shadow-xs gap-2"
          >
            <Layers className="size-4" />
            <span>{saveMutation.isPending ? "Publicando..." : "Salvar & Publicar"}</span>
          </Button>
        </div>
      </div>

      {/* Navegação entre Abas Principais */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveMainTab("builder")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-11 ${
            activeMainTab === "builder"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Smartphone className="size-4" />
          <span>Construtor Visual do App</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("manifest")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-11 ${
            activeMainTab === "manifest"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Sliders className="size-4" />
          <span>Identidade & Manifesto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("telemetry")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-11 ${
            activeMainTab === "telemetry"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <BarChart3 className="size-4" />
          <span>Telemetria de Downloads</span>
          {Boolean(telemetry?.totalInstalls && telemetry.totalInstalls > 0) && (
            <Badge variant="secondary" className="px-2 py-0 text-xs ml-1">
              {telemetry?.totalInstalls}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("governance")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-11 ${
            activeMainTab === "governance"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <ShieldCheck className="size-4" />
          <span>Governança & Termos</span>
        </button>
      </div>

      {/* Conteúdo da Aba Construtor Visual (Dual Panel: Controles + Smartphone Canvas) */}
      {activeMainTab === "builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Painel Esquerdo: Controles dos Blocos Exclusivos do App */}
          <div className="lg:col-span-6 space-y-6">
            {/* Bloco 1: Paleta & Cores de Superfície */}
            <div className="bg-card border border-border/70 p-5 rounded-lg space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Palette className="size-4 text-primary" />
                <span>Paleta & Identidade do App</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Cor de Destaque / Botões</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="size-11 rounded-lg cursor-pointer border border-border shrink-0"
                    />
                    <Input
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="min-h-11 rounded-lg font-mono text-xs flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Fundo da Splash Screen</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="size-11 rounded-lg cursor-pointer border border-border shrink-0"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="min-h-11 rounded-lg font-mono text-xs flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Seções e Componentes da Home do App */}
            <div className="bg-card border border-border/70 p-5 rounded-lg space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <span>Blocos da Home do Aplicativo</span>
              </h3>

              <div className="space-y-3">
                {/* Toggle Stories Bar */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground">Destaques & Stories</span>
                    <p className="text-xs text-muted-foreground">Barra horizontal circular no topo do app.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showStoriesReel}
                    onChange={(e) => setShowStoriesReel(e.target.checked)}
                    className="size-4.5 rounded border-border text-primary cursor-pointer"
                  />
                </div>

                {/* Banner Promocional */}
                <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-foreground">Banner Promocional</span>
                      <p className="text-xs text-muted-foreground">Destaque de novidades e promoções com gradiente.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={showPromoBanner}
                      onChange={(e) => setShowPromoBanner(e.target.checked)}
                      className="size-4.5 rounded border-border text-primary cursor-pointer"
                    />
                  </div>

                  {showPromoBanner && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Título do Banner</Label>
                        <Input
                          value={bannerTitle}
                          onChange={(e) => setBannerTitle(e.target.value)}
                          className="min-h-10 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Subtítulo do Banner</Label>
                        <Input
                          value={bannerSubtitle}
                          onChange={(e) => setBannerSubtitle(e.target.value)}
                          className="min-h-10 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Toggle Categorias */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground">Grid Rápido de Categorias</span>
                    <p className="text-xs text-muted-foreground">Atalhos em 2 colunas com ícones segmentados.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showCategoryGrid}
                    onChange={(e) => setShowCategoryGrid(e.target.checked)}
                    className="size-4.5 rounded border-border text-primary cursor-pointer"
                  />
                </div>

                {/* Toggle Compra Rápida / Quick Checkout */}
                <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-foreground">Barra Flutuante de Compra Rápida</span>
                      <p className="text-xs text-muted-foreground">Botão inferior fixo com resumo de carrinho.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={showQuickCheckout}
                      onChange={(e) => setShowQuickCheckout(e.target.checked)}
                      className="size-4.5 rounded border-border text-primary cursor-pointer"
                    />
                  </div>

                  {showQuickCheckout && (
                    <div className="space-y-1 pt-2 border-t border-border/40">
                      <Label className="text-xs font-medium text-muted-foreground">Texto do Botão</Label>
                      <Input
                        value={quickCheckoutLabel}
                        onChange={(e) => setQuickCheckoutLabel(e.target.value)}
                        className="min-h-10 text-xs rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Toggle Barra Inferior (MobileBottomNav) */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground">Barra Inferior Nativa (Bottom Nav)</span>
                    <p className="text-xs text-muted-foreground">Navegação Apple HIG com 5 abas e badges.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showBottomNav}
                    onChange={(e) => setShowBottomNav(e.target.checked)}
                    className="size-4.5 rounded border-border text-primary cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Animação de Abertura (Splash) */}
            <div className="bg-card border border-border/70 p-5 rounded-lg space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Play className="size-4 text-primary" />
                <span>Animação de Abertura do App</span>
              </h3>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Estilo de Movimento</Label>
                <Select
                  value={splashAnimation}
                  onValueChange={(val: any) => setSplashAnimation(val)}
                >
                  <SelectTrigger className="min-h-11 rounded-lg text-xs font-medium">
                    <SelectValue placeholder="Selecione a animação" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="pulse" className="text-xs">Pulsação Gradual (Recomendado)</SelectItem>
                    <SelectItem value="bounce" className="text-xs">Salto Rítmico (Bounce)</SelectItem>
                    <SelectItem value="fade" className="text-xs">Fade Silencioso (Minimalista)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Painel Direito: Simulador de Smartphone Interativo */}
          <div className="lg:col-span-6 flex flex-col items-center sticky top-6">
            {/* Controles do Simulador */}
            <div className="flex items-center gap-2 mb-4 w-full justify-between max-w-xs">
              {/* Seletor de Tela */}
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setPhonePreviewScreen("app")}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    phonePreviewScreen === "app"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Home do App
                </button>
                <button
                  type="button"
                  onClick={() => setPhonePreviewScreen("splash")}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    phonePreviewScreen === "splash"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Splash Screen
                </button>
              </div>

              {/* Seletor de Dispositivo */}
              <Select
                value={phoneDeviceType}
                onValueChange={(val: any) => setPhoneDeviceType(val)}
              >
                <SelectTrigger className="h-8 text-xs font-medium w-32 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg">
                  <SelectItem value="iphone" className="text-xs">iPhone 16 Pro</SelectItem>
                  <SelectItem value="android" className="text-xs">Android Canvas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Frame do Smartphone */}
            <div className="w-80 h-168 bg-neutral-950 rounded-lg p-4 border-4 border-neutral-800 shadow-2xl relative flex flex-col select-none overflow-hidden">
              {/* Dynamic Island / Notch */}
              <div className="h-6 w-28 bg-neutral-900 rounded-full mx-auto mb-2 flex items-center justify-center shrink-0 z-30">
                <div className="size-2 rounded-full bg-neutral-950/80 mr-2" />
                <div className="size-2.5 rounded-full bg-neutral-950/60" />
              </div>

              {/* Tela do Smartphone */}
              <div className="flex-1 rounded-lg bg-background text-foreground flex flex-col overflow-hidden relative border border-neutral-900">
                {phonePreviewScreen === "app" ? (
                  <>
                    {/* Header do App */}
                    <div className="p-3 border-b border-border/50 flex items-center justify-between shrink-0 bg-card/90 backdrop-blur-md">
                      <div className="flex items-center gap-2">
                        {icon192Url ? (
                          <img
                            src={icon192Url}
                            alt={shortName}
                            className="size-7 rounded-lg object-cover"
                          />
                        ) : (
                          <div
                            style={{ backgroundColor: themeColor }}
                            className="size-7 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                          >
                            {shortName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-bold text-xs truncate max-w-36">
                          {appName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button type="button" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring p-1 rounded-lg hover:bg-muted text-muted-foreground">
                          <Search className="size-4" />
                        </button>
                        <button type="button" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring p-1 rounded-lg hover:bg-muted text-muted-foreground relative">
                          <Bell className="size-4" />
                          <span className="size-1.5 rounded-full bg-destructive absolute top-1 right-1" />
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Feed */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
                      {/* Stories / Destaques */}
                      {showStoriesReel && (
                        <div className="space-y-1">
                          <AppHomeFeed
                            appName={appName}
                            themeColor={themeColor}
                            bannerTitle={bannerTitle}
                            bannerSubtitle={bannerSubtitle}
                            products={catalogProducts}
                          />
                        </div>
                      )}

                      {/* Categorias */}
                      {showCategoryGrid && (
                        <CategoryGrid themeColor={themeColor} />
                      )}
                    </div>

                    {/* Quick Checkout Bar */}
                    {showQuickCheckout && (
                      <QuickCheckoutButton
                        themeColor={themeColor}
                        label={quickCheckoutLabel}
                      />
                    )}

                    {/* Bottom Nav */}
                    {showBottomNav && (
                      <MobileBottomNav
                        activeTab={phoneActiveTab}
                        onTabChange={(tab) => setPhoneActiveTab(tab)}
                        accentColor={themeColor}
                      />
                    )}
                  </>
                ) : (
                  /* Splash Screen Preview */
                  <PwaSplashPreview
                    appName={appName}
                    shortName={shortName}
                    themeColor={themeColor}
                    backgroundColor={backgroundColor}
                    iconUrl={icon512Url || icon192Url}
                    splashImageUrl={splashImageUrl}
                    animationType={splashAnimation}
                  />
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3 font-medium">
              Simulador em tempo real com catálogo bilateral ativo
            </p>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Manifesto & Identidade */}
      {activeMainTab === "manifest" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-card border border-border/70 p-5 rounded-lg space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Smartphone className="size-4 text-primary" />
                <span>Nomenclatura do Aplicativo</span>
              </h3>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Nome Completo do App</Label>
                  <Input
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Ex: Armazém & Empório da Esquina"
                    className="min-h-11 rounded-lg text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Nome Curto (Ícone na Home)</Label>
                    <Input
                      value={shortName}
                      onChange={(e) => setShortName(e.target.value)}
                      placeholder="Ex: Armazém"
                      maxLength={30}
                      className="min-h-11 rounded-lg text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Rota de Abertura Inicial</Label>
                    <Input
                      value={startUrl}
                      onChange={(e) => setStartUrl(e.target.value)}
                      placeholder="/"
                      className="min-h-11 rounded-lg text-sm font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Descrição no Manifesto</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Faça seus pedidos e consulte produtos direto pelo app oficial."
                    className="min-h-11 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border/70 p-5 rounded-lg space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                <span>Ícones e Imagens de Abertura</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Ícone Padrão (192x192)</Label>
                  <ImageUpload
                    value={icon192Url}
                    onChange={(url) => setIcon192Url(url)}
                    onRemove={() => setIcon192Url(null)}
                    bucket="store-assets"
                    aspectPreset="square"
                    helperText="Formato PNG quadrado (192x192px)"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Ícone HD / Splash (512x512)</Label>
                  <ImageUpload
                    value={icon512Url}
                    onChange={(url) => setIcon512Url(url)}
                    onRemove={() => setIcon512Url(null)}
                    bucket="store-assets"
                    aspectPreset="square"
                    helperText="Alta resolução PNG (512x512px)"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Splash Screen Panorâmica (Opcional)</Label>
                <ImageUpload
                  value={splashImageUrl}
                  onChange={(url) => setSplashImageUrl(url)}
                  onRemove={() => setSplashImageUrl(null)}
                  bucket="store-assets"
                  aspectPreset="portrait"
                  helperText="Imagem vertical para tela de abertura do app"
                />
              </div>
            </div>

            <div className="bg-card border border-border/70 p-5 rounded-lg space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Globe className="size-4 text-primary" />
                <span>Janela & Domínio Personalizado</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Modo de Exibição</Label>
                  <Select
                    value={displayMode}
                    onValueChange={(val: any) => setDisplayMode(val)}
                  >
                    <SelectTrigger className="min-h-11 rounded-lg text-xs font-medium">
                      <SelectValue placeholder="Selecione o modo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="standalone" className="text-xs">Standalone (Janela de App nativo)</SelectItem>
                      <SelectItem value="fullscreen" className="text-xs">Fullscreen (Imersivo)</SelectItem>
                      <SelectItem value="minimal-ui" className="text-xs">Minimal UI (Comandos simplificados)</SelectItem>
                      <SelectItem value="browser" className="text-xs">Browser (Navegador)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Orientação do Dispositivo</Label>
                  <Select
                    value={orientation}
                    onValueChange={(val: any) => setOrientation(val)}
                  >
                    <SelectTrigger className="min-h-11 rounded-lg text-xs font-medium">
                      <SelectValue placeholder="Selecione a orientação" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="portrait" className="text-xs">Retrato (Vertical Smartphone)</SelectItem>
                      <SelectItem value="landscape" className="text-xs">Paisagem (Horizontal Tablet)</SelectItem>
                      <SelectItem value="any" className="text-xs">Livre (Giro automático)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-xs font-semibold text-muted-foreground">Domínio Personalizado para o App</Label>
                <Input
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="app.minhaloja.com.br"
                  className="min-h-11 rounded-lg text-sm font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-lg border border-border/70 bg-card space-y-3 shadow-xs">
              <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Resumo do Manifesto</h4>
              <div className="p-3 rounded-lg bg-muted font-mono text-xs space-y-1 text-muted-foreground overflow-x-auto">
                <p><span className="text-primary font-bold">name:</span> {appName}</p>
                <p><span className="text-primary font-bold">short_name:</span> {shortName}</p>
                <p><span className="text-primary font-bold">display:</span> {displayMode}</p>
                <p><span className="text-primary font-bold">start_url:</span> {startUrl}</p>
                <p><span className="text-primary font-bold">theme_color:</span> {themeColor}</p>
                <p><span className="text-primary font-bold">bg_color:</span> {backgroundColor}</p>
              </div>

              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full min-h-11 rounded-lg font-bold bg-primary text-primary-foreground shadow-xs gap-2"
              >
                <Layers className="size-4" />
                <span>Salvar Manifesto</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Telemetria de Downloads (Phase 3) */}
      {activeMainTab === "telemetry" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total de Instalações */}
            <div className="p-5 rounded-lg border border-border/70 bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Total de Instalações</span>
                <Download className="size-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-foreground">
                  {telemetry?.totalInstalls || 0}
                </span>
                <span className="text-xs text-emerald-600 font-semibold">Dispositivos</span>
              </div>
              <p className="text-xs text-muted-foreground">Confirmadas via evento appinstalled</p>
            </div>

            {/* Card 2: Prompts Exibidos */}
            <div className="p-5 rounded-lg border border-border/70 bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Banners de Instalação</span>
                <Smartphone className="size-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-foreground">
                  {telemetry?.promptsShown || 0}
                </span>
                <span className="text-xs text-muted-foreground font-semibold">Exibições</span>
              </div>
              <p className="text-xs text-muted-foreground">Navegadores com suporte nativo</p>
            </div>

            {/* Card 3: Taxa de Aceite / Conversão */}
            <div className="p-5 rounded-lg border border-border/70 bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Conversão de Instalação</span>
                <BarChart3 className="size-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-foreground">
                  {telemetry?.conversionRatePct || 0}%
                </span>
                <span className="text-xs text-amber-600 font-semibold">Taxa de Aceite</span>
              </div>
              <p className="text-xs text-muted-foreground">Usuários que aceitaram instalar</p>
            </div>

            {/* Card 4: Aberturas em Modo App */}
            <div className="p-5 rounded-lg border border-border/70 bg-card shadow-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold">Sessões Standalone</span>
                <Eye className="size-4 text-purple-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-foreground">
                  {telemetry?.appOpens || 0}
                </span>
                <span className="text-xs text-purple-600 font-semibold">Lançamentos</span>
              </div>
              <p className="text-xs text-muted-foreground">Aberturas direto pelo ícone da tela inicial</p>
            </div>
          </div>

          {/* Breakdown por Plataforma e Linha do Tempo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 bg-card border border-border/70 p-5 rounded-lg space-y-4 shadow-xs">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Smartphone className="size-4 text-primary" />
                <span>Instalações por Plataforma</span>
              </h4>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Android (Chrome/Edge)</span>
                  <span className="font-mono text-muted-foreground">
                    {telemetry?.platformBreakdown.android || 0}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    style={{
                      width: `${
                        telemetry?.totalInstalls
                          ? Math.round(
                              ((telemetry.platformBreakdown.android || 0) /
                                (telemetry.totalInstalls || 1)) *
                                100,
                            )
                          : 0
                      }%`,
                    }}
                    className="h-full bg-emerald-500 rounded-full transition-all"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="font-semibold text-foreground">iOS / iPhone (Safari)</span>
                  <span className="font-mono text-muted-foreground">
                    {telemetry?.platformBreakdown.ios || 0}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    style={{
                      width: `${
                        telemetry?.totalInstalls
                          ? Math.round(
                              ((telemetry.platformBreakdown.ios || 0) /
                                (telemetry.totalInstalls || 1)) *
                                100,
                            )
                          : 0
                      }%`,
                    }}
                    className="h-full bg-blue-500 rounded-full transition-all"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="font-semibold text-foreground">Desktop & Outros</span>
                  <span className="font-mono text-muted-foreground">
                    {(telemetry?.platformBreakdown.desktop || 0) +
                      (telemetry?.platformBreakdown.other || 0)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    style={{
                      width: `${
                        telemetry?.totalInstalls
                          ? Math.round(
                              (((telemetry.platformBreakdown.desktop || 0) +
                                (telemetry.platformBreakdown.other || 0)) /
                                (telemetry.totalInstalls || 1)) *
                                100,
                            )
                          : 0
                      }%`,
                    }}
                    className="h-full bg-purple-500 rounded-full transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Eventos Recentes */}
            <div className="lg:col-span-7 bg-card border border-border/70 p-5 rounded-lg space-y-4 shadow-xs">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                <span>Histórico Recente de Interações PWA</span>
              </h4>

              {telemetry?.recentEvents && telemetry.recentEvents.length > 0 ? (
                <div className="divide-y divide-border/50 text-xs">
                  {telemetry.recentEvents.map((evt) => (
                    <div key={evt.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2 rounded-full ${
                            evt.eventType === "installed"
                              ? "bg-emerald-500"
                              : evt.eventType === "app_opened"
                              ? "bg-purple-500"
                              : "bg-blue-500"
                          }`}
                        />
                        <span className="font-semibold capitalize text-foreground">
                          {evt.eventType.replace("_", " ")}
                        </span>
                        <Badge variant="outline" className="text-xs py-0 uppercase">
                          {evt.platform}
                        </Badge>
                      </div>

                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(evt.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Nenhum evento de instalação registrado ainda.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba Governança & Termos */}
      {activeMainTab === "governance" && (
        <div className="max-w-2xl space-y-6">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">Governança Jurídica do Aplicativo</h3>
            <p className="text-xs text-muted-foreground">
              Separação contratual e jurídica entre a plataforma tecnológica Waesy e a operação comercial da sua loja.
            </p>
          </div>

          <PwaLegalDisclaimer
            storeName={appName}
            checked={legalAccepted}
            onCheckedChange={setLegalAccepted}
          />
        </div>
      )}
    </div>
  );
}
