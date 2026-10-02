import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Share2, Save, Globe, Smartphone, ExternalLink, Copy, Check, Star, RefreshCw, Info, Layers, Eye, MessageCircle, Twitter, Facebook, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { getStoreSocialShareSettings, saveStoreSocialShareSettings, type StoreSocialShareSettingsDTO } from "@/services/marketing.functions";

export const Route = createFileRoute("/workspace/marketing/social")({
  head: () => ({
    meta: [{ title: "Redes Sociais | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const settings = await getStoreSocialShareSettings();
      return { settings };
    } catch (err: any) {
      console.error("[loader:workspace.marketing.social] error:", err);
      return { settings: null };
    }
  },
  component: WorkspaceMarketingSocialPage,
});

export default function WorkspaceMarketingSocialPage() {
  const router = useRouter();
  const { settings } = Route.useLoaderData();

  // Formulário State
  const [ogTitleTemplate, setOgTitleTemplate] = useState(
    settings?.og_title_template || "{item_title} | {store_name}"
  );
  const [ogDescriptionTemplate, setOgDescriptionTemplate] = useState(
    settings?.og_description_template ||
      "Confira {item_title} na {store_name}. Atendimento rápido e direto no WhatsApp!"
  );
  const [defaultOgImageUrl, setDefaultOgImageUrl] = useState(
    settings?.default_og_image_url || ""
  );
  const [whatsappShareTemplate, setWhatsappShareTemplate] = useState(
    settings?.whatsapp_share_template ||
      "Olá! Encontrei isso na {store_name} e achei que você iria gostar: {item_title} ({item_price}) {item_url}"
  );
  const [twitterCardType, setTwitterCardType] = useState<"summary_large_image" | "summary">(
    settings?.twitter_card_type || "summary_large_image"
  );
  const [siteNameSuffix, setSiteNameSuffix] = useState(settings?.site_name_suffix || "Waesy");

  // Estado de simulação visual
  const [previewPlatform, setPreviewPlatform] = useState<"whatsapp" | "twitter" | "facebook">("whatsapp");
  const [previewScenario, setPreviewScenario] = useState<"product" | "store">("product");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const storeName = settings?.store_name || "Sua Loja";
  const storeSlug = settings?.store_slug || "loja";
  const previewProduct = {
    title: "Pacote Exclusivo Fim de Semana",
    price: "R$ 499,00",
    description: "Hospedagem completa com café da manhã e passeios inclusos na serra.",
    url: `https://usewaesy.com/${storeSlug}/pacote-fim-de-semana`,
    image:
      defaultOgImageUrl ||
      settings?.store_banner_url ||
      settings?.store_logo_url ||
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=630&fit=crop",
  };

  // Gerador dinâmico de texto formatado
  const computedTitle = useMemo(() => {
    const raw = previewScenario === "product" ? ogTitleTemplate : "{store_name} | Loja Oficial";
    return raw
      .replace(/{item_title}/g, previewProduct.title)
      .replace(/{store_name}/g, storeName);
  }, [ogTitleTemplate, previewScenario, storeName]);

  const computedDescription = useMemo(() => {
    const raw =
      previewScenario === "product"
        ? ogDescriptionTemplate
        : "Descubra ofertas exclusivas, catálogo completo e compre direto com facilidade.";
    return raw
      .replace(/{item_title}/g, previewProduct.title)
      .replace(/{item_description}/g, previewProduct.description)
      .replace(/{store_name}/g, storeName);
  }, [ogDescriptionTemplate, previewScenario, storeName]);

  const computedWhatsappMessage = useMemo(() => {
    return whatsappShareTemplate
      .replace(/{item_title}/g, previewProduct.title)
      .replace(/{item_price}/g, previewProduct.price)
      .replace(/{item_url}/g, previewProduct.url)
      .replace(/{store_name}/g, storeName);
  }, [whatsappShareTemplate, storeName]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveStoreSocialShareSettings({
        data: {
          og_title_template: ogTitleTemplate,
          og_description_template: ogDescriptionTemplate,
          default_og_image_url: defaultOgImageUrl,
          whatsapp_share_template: whatsappShareTemplate,
          twitter_card_type: twitterCardType,
          site_name_suffix: siteNameSuffix,
          enable_smart_preview: true,
        },
      });
      toast.success("Configurações de compartilhamento salvas com sucesso!");
      router.invalidate();
    } catch (err: any) {
      console.error("[saveStoreSocialShareSettings] error:", err);
      toast.error(err?.message || "Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyTestLink = () => {
    navigator.clipboard.writeText(previewProduct.url);
    setCopiedLink(true);
    toast.success("Link de teste copiado!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenWhatsAppTest = () => {
    const encoded = encodeURIComponent(computedWhatsappMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  const insertVariable = (variable: string, target: "title" | "description" | "whatsapp") => {
    if (target === "title") {
      setOgTitleTemplate((prev) => `${prev} ${variable}`);
    } else if (target === "description") {
      setOgDescriptionTemplate((prev) => `${prev} ${variable}`);
    } else {
      setWhatsappShareTemplate((prev) => `${prev} ${variable}`);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <Share2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Redes Sociais
            </h1>
            <Badge variant="outline" className="text-xs font-mono">
              Open Graph
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenWhatsAppTest}
            className="rounded-lg h-10 px-4 gap-2"
          >
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span>Testar no WhatsApp</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg h-10 px-5 gap-2 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Salvando..." : "Salvar Configurações"}</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Form Controls (Left) + Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Open Graph & SEO Tags */}
          <div className="bg-card border border-border/60 rounded-lg p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">
                  Metatags de Cartão Social (Open Graph)
                </h2>
              </div>
              <Badge variant="secondary" className="text-xs">
                {siteNameSuffix}
              </Badge>
            </div>

            {/* Template do Título */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">
                  Modelo do Título Social (og:title)
                </Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => insertVariable("{item_title}", "title")}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + item_title
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable("{store_name}", "title")}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + store_name
                  </button>
                </div>
              </div>
              <Input
                value={ogTitleTemplate}
                onChange={(e) => setOgTitleTemplate(e.target.value)}
                placeholder="{item_title} | {store_name}"
                className="h-10 text-sm rounded-lg font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Define o título em negrito exibido nos cards de link. Limite ideal: 60 caracteres.
              </p>
            </div>

            {/* Template da Descrição */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">
                  Modelo da Descrição (og:description)
                </Label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => insertVariable("{item_title}", "description")}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + item_title
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable("{item_description}", "description")}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + item_description
                  </button>
                </div>
              </div>
              <Textarea
                value={ogDescriptionTemplate}
                onChange={(e) => setOgDescriptionTemplate(e.target.value)}
                rows={3}
                placeholder="Confira {item_title} na {store_name}..."
                className="text-sm rounded-lg"
              />
              <p className="text-xs text-muted-foreground">
                Resumo curto do produto ou página. Limite ideal: 120 caracteres.
              </p>
            </div>

            {/* Imagem Padrão de Compartilhamento */}
            <div className="space-y-2 pt-2 border-t border-border/30">
              <Label className="text-xs font-medium text-foreground">
                Imagem Padrão de Compartilhamento (Fallback 1200x630px)
              </Label>
              <div className="max-w-md">
                <ImageUpload
                  value={defaultOgImageUrl}
                  onChange={(url) => setDefaultOgImageUrl(url || "")}
                  aspectPreset="banner"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Exibida quando a página principal da loja ou categorias são compartilhadas sem uma foto específica. Proporção recomendada 1.91:1.
              </p>
            </div>
          </div>

          {/* Card 2: WhatsApp Share Message Template */}
          <div className="bg-card border border-border/60 rounded-lg p-6 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-500" />
                <h2 className="text-base font-semibold text-foreground">
                  Mensagem Automática para WhatsApp
                </h2>
              </div>
              <Badge variant="outline" className="text-xs text-emerald-600 bg-emerald-500/10 border-emerald-200">
                1-Clique
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-foreground">
                  Texto Padrão de Disparo
                </Label>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => insertVariable("{item_title}", "whatsapp")}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground"
                  >
                    + item_title
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable("{item_price}", "whatsapp")}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground"
                  >
                    + item_price
                  </button>
                  <button
                    type="button"
                    onClick={() => insertVariable("{item_url}", "whatsapp")}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground"
                  >
                    + item_url
                  </button>
                </div>
              </div>
              <Textarea
                value={whatsappShareTemplate}
                onChange={(e) => setWhatsappShareTemplate(e.target.value)}
                rows={3}
                placeholder="Olá! Veja o que encontrei..."
                className="text-sm rounded-lg font-sans"
              />
              <p className="text-xs text-muted-foreground">
                Esse texto é pré-preenchido quando clientes ou vendedores clicam no botão de compartilhar via WhatsApp.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40 text-xs">
              <span className="text-muted-foreground">Sufixo de Plataforma</span>
              <Input
                value={siteNameSuffix}
                onChange={(e) => setSiteNameSuffix(e.target.value)}
                className="h-8 w-32 text-xs rounded-lg text-right"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border/60 rounded-lg p-6 space-y-5 shadow-xs sticky top-6">
            {/* Header da Prévia */}
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <h2 className="text-base font-semibold text-foreground">
                  Simulador de Prévia Real
                </h2>
              </div>
              <div className="flex gap-1 bg-muted p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewScenario("product")}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    previewScenario === "product"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground"
                  }`}
                >
                  Produto
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScenario("store")}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    previewScenario === "store"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground"
                  }`}
                >
                  Vitrine
                </button>
              </div>
            </div>

            {/* Plataforma Selector */}
            <div className="flex items-center justify-center gap-2 p-1 bg-muted/50 rounded-lg">
              <button
                type="button"
                onClick={() => setPreviewPlatform("whatsapp")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                  previewPlatform === "whatsapp"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewPlatform("twitter")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                  previewPlatform === "twitter"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Twitter className="w-3.5 h-3.5 text-sky-500" />
                <span>X / Twitter</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewPlatform("facebook")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                  previewPlatform === "facebook"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Facebook className="w-3.5 h-3.5 text-blue-600" />
                <span>Facebook</span>
              </button>
            </div>

            {/* SIMULADOR WHATSAPP */}
            {previewPlatform === "whatsapp" && (
              <div className="bg-[#EFEAE2] dark:bg-[#0b141a] rounded-lg p-4 border border-border/40 font-sans shadow-inner">
                <div className="max-w-[340px] ml-auto">
                  <div className="bg-[#DCF8C6] dark:bg-[#005c4b] text-foreground rounded-lg rounded-tr-none p-3 shadow-xs space-y-2 text-xs">
                    {/* Mensagem de texto antes do link */}
                    <p className="text-xs leading-relaxed break-words whitespace-pre-wrap dark:text-[#e9edef] text-[#111b21]">
                      {computedWhatsappMessage}
                    </p>

                    {/* Card de Link Prévia do WhatsApp */}
                    <div className="bg-black/5 dark:bg-black/20 rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
                      <div className="aspect-[1.91/1] w-full bg-muted overflow-hidden relative">
                        <img
                          src={previewProduct.image}
                          alt={computedTitle}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-black/70 text-white border-0 text-xs px-2 py-1">
                            {storeName}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3 space-y-1">
                        <h4 className="font-semibold text-xs leading-snug line-clamp-2 dark:text-[#e9edef] text-[#111b21]">
                          {computedTitle}
                        </h4>
                        <p className="text-xs line-clamp-2 text-muted-foreground dark:text-[#8696a0]">
                          {computedDescription}
                        </p>
                        <p className="text-xs text-muted-foreground/80 dark:text-[#8696a0] font-mono truncate pt-1">
                          usewaesy.com
                        </p>
                      </div>
                    </div>

                    {/* Timestamp do WhatsApp */}
                    <div className="text-xs text-right text-muted-foreground dark:text-[#8696a0] pt-1">
                      12:45 
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SIMULADOR TWITTER / X */}
            {previewPlatform === "twitter" && (
              <div className="bg-background border border-border rounded-lg overflow-hidden shadow-xs">
                <div className="aspect-[1.91/1] w-full bg-muted overflow-hidden relative">
                  <img
                    src={previewProduct.image}
                    alt={computedTitle}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2">
                    <Badge className="bg-black/80 text-white text-xs">
                      usewaesy.com
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    usewaesy.com
                  </p>
                  <h4 className="font-semibold text-sm leading-snug text-foreground line-clamp-1">
                    {computedTitle}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {computedDescription}
                  </p>
                </div>
              </div>
            )}

            {/* SIMULADOR FACEBOOK */}
            {previewPlatform === "facebook" && (
              <div className="bg-card border border-border rounded-lg overflow-hidden shadow-xs">
                <div className="aspect-[1.91/1] w-full bg-muted overflow-hidden">
                  <img
                    src={previewProduct.image}
                    alt={computedTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 bg-muted/30 border-t border-border/40 space-y-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
                    USEWAESY.COM
                  </p>
                  <h4 className="font-bold text-xs leading-snug text-foreground line-clamp-1">
                    {computedTitle}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {computedDescription}
                  </p>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Link Canônico de Demonstração:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyTestLink}
                className="h-8 gap-2 text-xs text-primary"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copiado" : "Copiar Link"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
