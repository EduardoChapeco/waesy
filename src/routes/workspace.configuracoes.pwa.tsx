import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Smartphone, Palette, Upload, CheckCircle2, ExternalLink, Layers, Share2, Sparkles, Monitor, RotateCcw, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { getStorePwaConfig, saveStorePwaConfig } from "@/services/pwa.functions";

export const Route = createFileRoute("/workspace/configuracoes/pwa")({
  head: () => ({ meta: [{ title: "Aplicativo PWA | Workspace Waesy" }] }),
  component: PwaEditorPage,
});

function PwaEditorPage() {
  const queryClient = useQueryClient();

  // Estados do Manifesto PWA
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

  // Estado do Preview Interativo
  const [previewTab, setPreviewTab] = useState<"home" | "splash">("home");

  const { data: config, isLoading } = useQuery({
    queryKey: ["store-pwa-config"],
    queryFn: () => getStorePwaConfig(),
  });

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
    }
  }, [config]);

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
        },
      }),
    onSuccess: () => {
      toast.success("Configurações do PWA salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["store-pwa-config"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao salvar PWA.");
    },
  });

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 max-w-7xl mx-auto pb-24 animate-in fade-in duration-200">
      <PageHeader
        title="Aplicativo PWA Próprio"
        description="Configure o aplicativo instalável para Android e iOS da sua marca com ícones, cores e splash screen personalizados."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Painel de Configurações do PWA */}
        <div className="lg:col-span-7 space-y-6">
          {/* Seção 1: Identidade Básica */}
          <div className="bg-card border border-border/70 p-5 sm:p-6 rounded-2xl space-y-4 shadow-xs">
            <h3 className="font-bold text-sm tracking-tight text-foreground flex items-center gap-2">
              <Smartphone className="size-4 text-primary" />
              <span>Identidade do Aplicativo</span>
            </h3>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Nome Completo do App</Label>
                <Input
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Ex: Armazém & Empório da Esquina"
                  className="min-h-[44px] rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Nome Curto (Ícone na Tela Inicial)</Label>
                  <Input
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="Ex: Armazém"
                    maxLength={30}
                    className="min-h-[44px] rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Rota de Abertura Inicial</Label>
                  <Input
                    value={startUrl}
                    onChange={(e) => setStartUrl(e.target.value)}
                    placeholder="/"
                    className="min-h-[44px] rounded-xl text-sm font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Descrição do Aplicativo</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Faça seus pedidos e consulte produtos direto pelo app oficial."
                  className="min-h-[44px] rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Ícones do App & Imagens de Abertura */}
          <div className="bg-card border border-border/70 p-5 sm:p-6 rounded-2xl space-y-4 shadow-xs">
            <h3 className="font-bold text-sm tracking-tight text-foreground flex items-center gap-2">
              <ImageIcon className="size-4 text-primary" />
              <span>Ícones e Imagens de Abertura</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Ícone Principal (192x192)</Label>
                <ImageUpload
                  value={icon192Url}
                  onChange={(url) => setIcon192Url(url)}
                  onRemove={() => setIcon192Url(null)}
                  bucket="store-assets"
                  aspectPreset="square"
                  helperText="Quadrado (192x192px PNG recomendado)"
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
                  helperText="Alta resolução (512x512px PNG)"
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
                helperText="Imagem vertical para tela de carregamento"
              />
            </div>
          </div>

          {/* Seção 3: Cores e Janela de Exibição */}
          <div className="bg-card border border-border/70 p-5 sm:p-6 rounded-2xl space-y-4 shadow-xs">
            <h3 className="font-bold text-sm tracking-tight text-foreground flex items-center gap-2">
              <Palette className="size-4 text-primary" />
              <span>Cores e Modo de Janela</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Cor da Barra de Status / Topo</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="size-11 rounded-xl cursor-pointer border border-border shrink-0"
                  />
                  <Input
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="min-h-[44px] rounded-xl font-mono text-xs flex-1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Cor de Fundo da Splash Screen</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="size-11 rounded-xl cursor-pointer border border-border shrink-0"
                  />
                  <Input
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="min-h-[44px] rounded-xl font-mono text-xs flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Modo de Exibição</Label>
                <Select
                  value={displayMode}
                  onValueChange={(val: any) => setDisplayMode(val)}
                >
                  <SelectTrigger className="min-h-[44px] rounded-xl text-xs font-medium">
                    <SelectValue placeholder="Selecione o modo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="standalone" className="text-xs">Standalone (Janela própria sem URL)</SelectItem>
                    <SelectItem value="fullscreen" className="text-xs">Fullscreen (Imersivo tela cheia)</SelectItem>
                    <SelectItem value="minimal-ui" className="text-xs">Minimal UI (Com controles mínimos)</SelectItem>
                    <SelectItem value="browser" className="text-xs">Browser (Navegador padrão)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Orientação Padrão</Label>
                <Select
                  value={orientation}
                  onValueChange={(val: any) => setOrientation(val)}
                >
                  <SelectTrigger className="min-h-[44px] rounded-xl text-xs font-medium">
                    <SelectValue placeholder="Selecione a orientação" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="portrait" className="text-xs">Retrato (Vertical Smartphone)</SelectItem>
                    <SelectItem value="landscape" className="text-xs">Paisagem (Horizontal Tablet/Kiosk)</SelectItem>
                    <SelectItem value="any" className="text-xs">Livre (Giro automático)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Botão de Salvar */}
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full min-h-[48px] rounded-xl font-bold bg-primary text-primary-foreground shadow-xs gap-2"
          >
            <Layers className="size-4" />
            <span>{saveMutation.isPending ? "Salvando..." : "Salvar e Publicar Aplicativo PWA"}</span>
          </Button>
        </div>

        {/* Live Preview de Smartphone (Apple HIG) */}
        <div className="lg:col-span-5 flex flex-col items-center sticky top-6">
          {/* Seletor de Modo de Preview */}
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-xl mb-4 border border-border/60">
            <button
              type="button"
              onClick={() => setPreviewTab("home")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                previewTab === "home"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tela Inicial (Ícone)
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("splash")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                previewTab === "splash"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Splash de Abertura
            </button>
          </div>

          {/* Frame de iPhone */}
          <div className="w-[300px] h-[610px] bg-neutral-950 rounded-[50px] p-3.5 border-4 border-neutral-800 shadow-xl relative flex flex-col select-none">
            {/* Dynamic Island */}
            <div className="h-5 w-24 bg-neutral-900 rounded-full mx-auto mb-3 flex items-center justify-center shrink-0">
              <div className="size-2 rounded-full bg-neutral-950/80 mr-2" />
            </div>

            {/* Tela Interna */}
            <div
              style={{ backgroundColor }}
              className="flex-1 rounded-[38px] p-4 flex flex-col items-center justify-between text-center overflow-hidden border border-neutral-900 relative transition-colors duration-300"
            >
              {previewTab === "home" ? (
                <>
                  <div className="mt-8 space-y-4 flex flex-col items-center w-full">
                    {/* Ícone Renderizado */}
                    {icon192Url ? (
                      <div className="size-20 rounded-2xl overflow-hidden shadow-md border border-white/10 shrink-0">
                        <img
                          src={icon192Url}
                          alt={shortName}
                          className="size-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        style={{ backgroundColor: themeColor }}
                        className="size-20 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-md border border-white/10 shrink-0"
                      >
                        {shortName.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <h4 className="font-bold text-base text-white truncate max-w-[220px]">
                        {appName}
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        Instalável via Safari e Chrome
                      </p>
                    </div>
                  </div>

                  <div className="w-full space-y-2">
                    <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-[11px] text-white font-medium flex items-center justify-center gap-1.5 border border-white/10">
                      <Share2 className="size-3.5" />
                      <span>Adicionar à Tela de Início</span>
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      PWA Autônomo • Modo {displayMode}
                    </p>
                  </div>
                </>
              ) : (
                /* Splash Screen View */
                <div className="size-full flex flex-col items-center justify-center space-y-4 my-auto">
                  {splashImageUrl ? (
                    <img
                      src={splashImageUrl}
                      alt="Splash"
                      className="max-h-48 max-w-[180px] object-contain rounded-2xl shadow-sm"
                    />
                  ) : icon512Url ? (
                    <img
                      src={icon512Url}
                      alt={shortName}
                      className="size-24 object-contain rounded-2xl shadow-sm"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: themeColor }}
                      className="size-24 rounded-3xl flex items-center justify-center font-black text-3xl text-white shadow-lg border border-white/15"
                    >
                      {shortName.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-1">
                    <h4 className="font-bold text-lg text-white tracking-tight">
                      {shortName}
                    </h4>
                    <div className="flex items-center justify-center gap-1 pt-2">
                      <div className="size-1.5 rounded-full bg-white/60 animate-bounce" />
                      <div className="size-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:0.2s]" />
                      <div className="size-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 font-medium">
            Pré-visualização em tempo real do PWA (Apple HIG)
          </p>
        </div>
      </div>
    </div>
  );
}
