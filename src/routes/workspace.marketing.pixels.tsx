import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Globe,
  Radio,
  Share2,
  ShieldCheck,
  Sliders,
  Sparkles,
  Copy,
  ExternalLink,
} from "lucide-react";
import {
  WhatsappLogo,
  GoogleLogo,
  TiktokLogo,
  MetaLogo,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getStorePixelConfig,
  saveStorePixelConfig,
  dispatchMetaCapiEvent,
  type StorePixelConfigDTO,
} from "@/services/pixels.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/marketing/pixels")({
  head: () => ({
    meta: [{ title: "Pixels & Telemetria Multicanal | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const config = await getStorePixelConfig();
      return { config };
    } catch (err: any) {
      console.error("[loader:workspace.marketing.pixels] error:", err);
      return { config: null };
    }
  },
  component: WorkspaceMarketingPixelsPage,
});

export default function WorkspaceMarketingPixelsPage() {
  const router = useRouter();
  const { config } = Route.useLoaderData();

  const [metaPixelId, setMetaPixelId] = useState(config?.meta_pixel_id || "");
  const [metaCapiToken, setMetaCapiToken] = useState(config?.meta_capi_token || "");
  const [googleAdsId, setGoogleAdsId] = useState(config?.google_ads_id || "");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState(config?.google_analytics_id || "");
  const [ga4ApiSecret, setGa4ApiSecret] = useState(() => {
    // O API Secret é armazenado como JSON dentro do campo google_ads_id para retrocompat
    try { return JSON.parse(config?.google_ads_id || "{}").api_secret || ""; } catch { return ""; }
  });
  const [tiktokPixelId, setTiktokPixelId] = useState(config?.tiktok_pixel_id || "");

  const [trackPageView, setTrackPageView] = useState(config?.track_page_view ?? true);
  const [trackViewContent, setTrackViewContent] = useState(config?.track_view_content ?? true);
  const [trackAddToCart, setTrackAddToCart] = useState(config?.track_add_to_cart ?? true);
  const [trackInitiateCheckout, setTrackInitiateCheckout] = useState(config?.track_initiate_checkout ?? true);
  const [trackLead, setTrackLead] = useState(config?.track_lead ?? true);
  const [trackWhatsappClick, setTrackWhatsappClick] = useState(config?.track_whatsapp_click ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [isTestingCapi, setIsTestingCapi] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveStorePixelConfig({
        data: {
          storeId: config?.store_id,
          meta_pixel_id: metaPixelId.trim() || null,
          meta_capi_token: metaCapiToken.trim() || null,
          // Armazena o AW-XXXX e o api_secret juntos como JSON para retrocompat
          google_ads_id: ga4ApiSecret.trim()
            ? JSON.stringify({ conversion_id: googleAdsId.trim(), api_secret: ga4ApiSecret.trim() })
            : (googleAdsId.trim() || null),
          google_analytics_id: googleAnalyticsId.trim() || null,
          tiktok_pixel_id: tiktokPixelId.trim() || null,
          track_page_view: trackPageView,
          track_view_content: trackViewContent,
          track_add_to_cart: trackAddToCart,
          track_initiate_checkout: trackInitiateCheckout,
          track_lead: trackLead,
          track_whatsapp_click: trackWhatsappClick,
        },
      });
      toast.success("Configuração de telemetria salva com sucesso!");
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar pixels.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestCapi = async () => {
    if (!config?.store_id) {
      toast.error("Identificador de loja não encontrado.");
      return;
    }
    if (!metaPixelId.trim() || !metaCapiToken.trim()) {
      toast.error("Preencha e salve o ID do Meta Pixel e o Token CAPI antes de testar.");
      return;
    }

    setIsTestingCapi(true);
    try {
      const res = await dispatchMetaCapiEvent({
        data: {
          storeId: config.store_id,
          eventName: "Lead",
          eventSourceUrl: window.location.href,
          customData: {
            test_event: true,
            source: "Workspace Waesy Telemetry Diagnostic",
          },
          userData: {
            clientUserAgent: navigator.userAgent,
          },
        },
      });

      if (res.sent) {
        toast.success("Evento de teste enviado com sucesso para a Meta Conversions API!");
      } else {
        toast.error(`Falha no envio do teste: ${res.reason || JSON.stringify(res.error)}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao testar envio CAPI.");
    } finally {
      setIsTestingCapi(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="size-9 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Link to="/workspace/marketing/telemetria">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Pixels & Telemetria Multicanal
            </h1>
            <p className="text-xs text-muted-foreground">
              Acompanhamento de conversões no Meta Ads, Google Ads e TikTok com suporte a CAPI server-side.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Link to="/workspace/marketing/studio">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Social Studio</span>
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestCapi}
            disabled={isTestingCapi}
            className="rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Radio className={cn("size-3.5", isTestingCapi && "animate-pulse text-primary")} />
            <span>{isTestingCapi ? "Testando CAPI..." : "Testar CAPI"}</span>
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ── Bloco 1: Meta Ads (Facebook & Instagram) ── */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <MetaLogo size={20} weight="bold" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Meta Ads (Facebook & Instagram)</h2>
                <p className="text-xs text-muted-foreground">
                  Rastreamento via Pixel no navegador e Conversions API (CAPI) pelo servidor.
                </p>
              </div>
            </div>
            {metaPixelId && (
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-500/30">
                Ativo
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">ID do Meta Pixel</Label>
              <Input
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                placeholder="Ex: 123456789012345"
                className="h-9 rounded-xl text-xs font-mono"
              />
              <span className="text-[11px] text-muted-foreground block">
                Localizado no Gerenciador de Eventos da Meta.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Token de Acesso da Conversions API (CAPI)</Label>
              <Input
                type="password"
                value={metaCapiToken}
                onChange={(e) => setMetaCapiToken(e.target.value)}
                placeholder="EAAB..."
                className="h-9 rounded-xl text-xs font-mono"
              />
              <span className="text-[11px] text-muted-foreground block">
                Garante o disparo de conversões pelo servidor, imune a bloqueadores de anúncios.
              </span>
            </div>
          </div>
        </div>

        {/* ── Bloco 2: Google Ads & Google Analytics ── */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <GoogleLogo size={20} weight="bold" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Google Ads & GA4</h2>
                <p className="text-xs text-muted-foreground">
                  Acompanhamento de tráfego, buscas e tags de conversão do Google.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">ID de Conversão do Google Ads</Label>
              <Input
                value={googleAdsId}
                onChange={(e) => setGoogleAdsId(e.target.value)}
                placeholder="Ex: AW-1234567890"
                className="h-9 rounded-xl text-xs font-mono"
              />
              <span className="text-[11px] text-muted-foreground block">
                Encontrado em Google Ads → Ferramentas → Conversões.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">ID de Medição do Google Analytics 4</Label>
              <Input
                value={googleAnalyticsId}
                onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                placeholder="Ex: G-XXXXXXXXXX"
                className="h-9 rounded-xl text-xs font-mono"
              />
              <span className="text-[11px] text-muted-foreground block">
                Encontrado em GA4 → Administração → Fluxos de dados.
              </span>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold">API Secret do GA4 (Measurement Protocol)</Label>
              <Input
                type="password"
                value={ga4ApiSecret}
                onChange={(e) => setGa4ApiSecret(e.target.value)}
                placeholder="Chave secreta do stream GA4 para Enhanced Conversions server-side"
                className="h-9 rounded-xl text-xs font-mono"
              />
              <span className="text-[11px] text-muted-foreground block">
                GA4 → Administração → Fluxos de dados → Measurement Protocol API secrets.
                Necessário para disparar conversões pelo servidor (Google Ads Enhanced Conversions).
              </span>
            </div>
          </div>
        </div>

        {/* ── Bloco 3: TikTok Ads ── */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <TiktokLogo size={20} weight="bold" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">TikTok Ads</h2>
                <p className="text-xs text-muted-foreground">
                  Pixel para campanhas de vídeo e tráfego no TikTok.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 max-w-md">
            <Label className="text-xs font-bold">ID do TikTok Pixel</Label>
            <Input
              value={tiktokPixelId}
              onChange={(e) => setTiktokPixelId(e.target.value)}
              placeholder="Ex: CXXXXXXXXXXXXXX"
              className="h-9 rounded-xl text-xs font-mono"
            />
          </div>
        </div>

        {/* ── Bloco: Feeds de Catálogo para Anúncios Dinâmicos (DPA & Google Shopping) ── */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Share2 className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Feeds de Catálogo para Anúncios Dinâmicos</h2>
                <p className="text-xs text-muted-foreground">
                  URLs padronizadas para sincronização contínua com Google Shopping e Catálogo Meta/Instagram.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <GoogleLogo size={16} weight="bold" className="text-amber-500" />
                  Google Merchant Center (Feed RSS XML)
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">XML 2.0</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={typeof window !== "undefined" && config?.store_id ? `${window.location.origin}/api/feed/xml?store=${config.store_id}` : ""}
                  className="h-8 rounded-lg text-xs font-mono bg-background text-muted-foreground"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 rounded-lg text-xs shrink-0 cursor-pointer"
                  onClick={() => {
                    if (config?.store_id) {
                      const url = `${window.location.origin}/api/feed/xml?store=${config.store_id}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Link do Feed XML copiado!");
                    }
                  }}
                >
                  <Copy className="size-3.5 mr-1" />
                  Copiar
                </Button>
                {config?.store_id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 rounded-lg text-xs shrink-0 cursor-pointer"
                    onClick={() => window.open(`/api/feed/xml?store=${config.store_id}`, "_blank")}
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <MetaLogo size={16} weight="bold" className="text-blue-600" />
                  Meta Commerce Manager (Catálogo DPA CSV)
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">CSV UTF-8</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={typeof window !== "undefined" && config?.store_id ? `${window.location.origin}/api/feed/meta.csv?store=${config.store_id}` : ""}
                  className="h-8 rounded-lg text-xs font-mono bg-background text-muted-foreground"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 rounded-lg text-xs shrink-0 cursor-pointer"
                  onClick={() => {
                    if (config?.store_id) {
                      const url = `${window.location.origin}/api/feed/meta.csv?store=${config.store_id}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Link do Catálogo CSV copiado!");
                    }
                  }}
                >
                  <Copy className="size-3.5 mr-1" />
                  Copiar
                </Button>
                {config?.store_id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 rounded-lg text-xs shrink-0 cursor-pointer"
                    onClick={() => window.open(`/api/feed/meta.csv?store=${config.store_id}`, "_blank")}
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bloco 4: Automação e Eventos Disparados ── */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-4 shadow-xs">
          <div className="pb-3 border-b border-border/40">
            <h2 className="text-sm font-bold text-foreground">Eventos Rastreados Automaticamente</h2>
            <p className="text-xs text-muted-foreground">
              Selecione quais interações devem disparar conversões para as redes de anúncio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={trackPageView}
                onChange={(e) => setTrackPageView(e.target.checked)}
                className="size-4 rounded-md accent-primary mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">PageView</span>
                <span className="text-muted-foreground">Dispara ao carregar qualquer página da vitrine.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={trackViewContent}
                onChange={(e) => setTrackViewContent(e.target.checked)}
                className="size-4 rounded-md accent-primary mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">ViewContent</span>
                <span className="text-muted-foreground">Dispara ao visualizar detalhes de um produto ou serviço.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={trackWhatsappClick}
                onChange={(e) => setTrackWhatsappClick(e.target.checked)}
                className="size-4 rounded-md accent-primary mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">Contact (WhatsApp)</span>
                <span className="text-muted-foreground">Dispara quando o visitante clica no botão oficial de WhatsApp.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={trackLead}
                onChange={(e) => setTrackLead(e.target.checked)}
                className="size-4 rounded-md accent-primary mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">Lead (Orçamentos)</span>
                <span className="text-muted-foreground">Dispara ao submeter solicitação de orçamento ou contato.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={trackAddToCart}
                onChange={(e) => setTrackAddToCart(e.target.checked)}
                className="size-4 rounded-md accent-primary mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">AddToCart</span>
                <span className="text-muted-foreground">Dispara ao adicionar item à sacola de compras.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 cursor-pointer hover:bg-muted/40 transition-colors">
              <input
                type="checkbox"
                checked={trackInitiateCheckout}
                onChange={(e) => setTrackInitiateCheckout(e.target.checked)}
                className="size-4 rounded-md accent-primary mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-foreground block">InitiateCheckout & Purchase</span>
                <span className="text-muted-foreground">Dispara ao abrir o checkout e concluir o pedido.</span>
              </div>
            </label>
          </div>
        </div>

        {/* ── Bloco 4: Feeds de Catálogo Dinâmico & WebMCP (Meta DPA, Google Shopping & IAs) ── */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Globe className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Feeds de Catálogo & WebMCP</h2>
                <p className="text-xs text-muted-foreground">
                  URLs padronizadas para sincronização automática com Meta Commerce Manager, Google Merchant Center e agentes de IA.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              Open Standard
            </Badge>
          </div>

          <div className="space-y-4">
            {/* Meta Catalog Feed (CSV) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>Feed Meta Commerce / Instagram Store (CSV DPA)</span>
                <span className="text-[10px] font-normal text-muted-foreground">Formato Oficial Meta Catalog</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={
                    typeof window !== "undefined" && config?.store_id
                      ? `${window.location.origin}/api/feed/meta.csv?store=${config.store_id}`
                      : "/api/feed/meta.csv"
                  }
                  className="h-9 rounded-xl text-xs font-mono bg-muted/30 select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-xl text-xs shrink-0 cursor-pointer"
                  onClick={() => {
                    const feedUrl = `${window.location.origin}/api/feed/meta.csv?store=${config?.store_id}`;
                    navigator.clipboard.writeText(feedUrl);
                    toast.success("URL do Feed Meta copiada!");
                  }}
                >
                  <Copy className="size-3.5 mr-1.5" /> Copiar
                </Button>
              </div>
            </div>

            {/* Google Merchant Center (XML RSS 2.0) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>Feed Google Shopping / Merchant Center (XML RSS 2.0)</span>
                <span className="text-[10px] font-normal text-muted-foreground">Formato Google Product Feed</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={
                    typeof window !== "undefined" && config?.store_id
                      ? `${window.location.origin}/api/feed/xml?store=${config.store_id}`
                      : "/api/feed/xml"
                  }
                  className="h-9 rounded-xl text-xs font-mono bg-muted/30 select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-xl text-xs shrink-0 cursor-pointer"
                  onClick={() => {
                    const feedUrl = `${window.location.origin}/api/feed/xml?store=${config?.store_id}`;
                    navigator.clipboard.writeText(feedUrl);
                    toast.success("URL do Feed Google copiada!");
                  }}
                >
                  <Copy className="size-3.5 mr-1.5" /> Copiar
                </Button>
              </div>
            </div>

            {/* WebMCP Manifest */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>Manifesto WebMCP para Agentes de IA (JSON)</span>
                <span className="text-[10px] font-normal text-muted-foreground">Indexação Gemini, Claude & Perplexity</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/api/webmcp.json`
                      : "/api/webmcp.json"
                  }
                  className="h-9 rounded-xl text-xs font-mono bg-muted/30 select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 rounded-xl text-xs shrink-0 cursor-pointer"
                  onClick={() => {
                    const mcpUrl = `${window.location.origin}/api/webmcp.json`;
                    navigator.clipboard.writeText(mcpUrl);
                    toast.success("URL do Manifesto WebMCP copiada!");
                  }}
                >
                  <Copy className="size-3.5 mr-1.5" /> Copiar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Ações Inferiores Fixas ── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            asChild
            variant="outline"
            className="rounded-xl text-xs h-10 px-4 cursor-pointer"
          >
            <Link to="/workspace/marketing/telemetria">Voltar</Link>
          </Button>

          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-xl text-xs h-10 px-6 font-bold bg-primary text-primary-foreground cursor-pointer"
          >
            {isSaving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
