import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, TrendingUp, Eye, DollarSign, Play, Pause, MapPin, Percent, Zap, ExternalLink, MessageCircle, ShoppingBag, Target, Image as ImageIcon, Loader2, Sliders, Globe, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyField } from "@/components/ui/currency-field";
import { MediaUploader } from "@/components/ui/media-uploader";
import { formatMoney } from "@/lib/money";
import { listAdCampaigns, toggleAdCampaignStatus, deleteAdCampaign, createAdCampaign, getStoreAdTargets, getStoreAdChannelsSettings, saveStoreAdChannelsSettings, generateUtmTrackingLink, getStoreMarketingTierStatus, upgradeStoreToWaesyMax, connectExternalAdAccountOAuth, dispatchExternalMetaOrGoogleCampaign, generateAiAdCreativeFromCatalog, getMarketingRoiClosedLoopMetrics, type AdCampaign, type StoreAdChannelsDTO } from "@/services/ads.functions";
import { Lock, ShieldCheck, ArrowUpRight, Layers } from "lucide-react";
import { boostAdCampaignAtomic } from "@/services/deep-core.functions";
import { WorkspaceCanonicalToolbar, type WorkspaceToolbarTab } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { CampaignDynamicBlock } from "@/components/marketing/campaign-dynamic-block";
import { executeMcpTool } from "@/services/mcp-server.functions";
import type { DynamicRenderableBlock } from "@/types/ad-tech-mcp";
import { Mic, MicOff, Send, Wand2 } from "lucide-react";

export const Route = createFileRoute("/workspace/marketing/anuncios")({
  head: () => ({ meta: [{ title: "Campanhas | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [campaigns, storeTargets, channelsSettings, tierStatus, roiMetrics] = await Promise.all([
        listAdCampaigns().catch(() => []),
        getStoreAdTargets().catch(() => ({ products: [], storePhone: null, storeSlug: "" })),
        getStoreAdChannelsSettings().catch(() => null),
        getStoreMarketingTierStatus().catch(() => ({ planTier: "free", isMaxUnlocked: false, boostDiscountPercent: 0, externalAdsAllowed: false, aiBuilderAllowed: false, connectedOAuthAccounts: [] })),
        getMarketingRoiClosedLoopMetrics().catch(() => null),
      ]);
      return {
        campaigns: Array.isArray(campaigns) ? campaigns : [],
        storeTargets: storeTargets || { products: [], storePhone: null, storeSlug: "" },
        channelsSettings,
        tierStatus,
        roiMetrics,
      };
    } catch {
      return {
        campaigns: [],
        storeTargets: { products: [], storePhone: null, storeSlug: "" },
        channelsSettings: null,
        tierStatus: { planTier: "free", isMaxUnlocked: false, boostDiscountPercent: 0, externalAdsAllowed: false, aiBuilderAllowed: false, connectedOAuthAccounts: [] },
        roiMetrics: null,
      };
    }
  },
  errorComponent: WorkspaceAnunciosErrorComponent,
  component: AnunciosWorkspacePage,
});

function WorkspaceAnunciosErrorComponent({ error }: { error: any }) {
  return (
    <div className="w-full max-w-lg mx-auto p-4 sm:p-8 text-center space-y-4">
      <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-1">
        <Megaphone className="size-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">Falha ao Carregar Campanhas</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Não foi possível sincronizar o módulo de anúncios no momento.
        </p>
      </div>
      {error?.message && (
        <pre className="mt-2 rounded-xl bg-muted/40 border border-border/50 p-3 text-[10px] text-muted-foreground overflow-auto max-h-32 text-left font-mono">
          {error.message}
        </pre>
      )}
      <div className="pt-2 flex items-center justify-center gap-3">
        <Button
          variant="default"
          size="sm"
          className="rounded-xl text-xs h-10 px-5 font-bold cursor-pointer"
          onClick={() => window.location.reload()}
        >
          Recarregar Página
        </Button>
      </div>
    </div>
  );
}

const FORMAT_LABELS: Record<string, string> = {
  post_patrocinado: "Post no Feed",
  banner_destaque: "Banner",
  story_patrocinado: "Stories",
  stories_sponsor: "Stories Imersivos",
  busca_topo: "Topo da Busca",
};

const QUICK_FORMATS = [
  { id: "post_patrocinado", title: "Feed (1:1)", aspect: 1 },
  { id: "banner_destaque", title: "Banner (21:9)", aspect: 21 / 9 },
  { id: "story_patrocinado", title: "Story (9:16)", aspect: 9 / 16 },
] as const;

function AnunciosWorkspacePage() {
  const router = useRouter();
  const { campaigns: initialCampaigns, storeTargets, channelsSettings, tierStatus: initialTierStatus, roiMetrics } = ((Route.useLoaderData?.() as any) || {});
  const [tierStatus, setTierStatus] = useState<any>(initialTierStatus || { planTier: "free", isMaxUnlocked: false, boostDiscountPercent: 0 });
  const [maxUpsellOpen, setMaxUpsellOpen] = useState(false);
  const [isUpgradingMax, setIsUpgradingMax] = useState(false);
  const [oauthTokenInput, setOauthTokenInput] = useState("");
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string>("");
  const [aiCreativePreview, setAiCreativePreview] = useState<any>(null);
  const [isGeneratingAiCreative, setIsGeneratingAiCreative] = useState(false);
  const [isPublishingExternal, setIsPublishingExternal] = useState(false);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(() =>
    Array.isArray(initialCampaigns) ? initialCampaigns : []
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Estados do Assistente MCP de Anúncios Dinâmicos
  const [mcpPrompt, setMcpPrompt] = useState("");
  const [isGeneratingMcp, setIsGeneratingMcp] = useState(false);
  const [dynamicBlock, setDynamicBlock] = useState<DynamicRenderableBlock | null>(null);
  const [isListeningVoice, setIsListeningVoice] = useState(false);

  const handleToggleVoice = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.info("Reconhecimento de voz não suportado neste navegador. Digite sua ideia!");
      return;
    }
    if (isListeningVoice) {
      setIsListeningVoice(false);
      return;
    }
    try {
      const recognition = new SpeechRec();
      recognition.lang = "pt-BR";
      recognition.continuous = false;
      recognition.interimResults = false;
      setIsListeningVoice(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMcpPrompt(transcript);
        setIsListeningVoice(false);
        handleGenerateMcp(transcript);
      };
      recognition.onerror = () => setIsListeningVoice(false);
      recognition.onend = () => setIsListeningVoice(false);
      recognition.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleGenerateMcp = async (customPrompt?: string) => {
    const promptToUse = (customPrompt || mcpPrompt).trim();
    if (!promptToUse) {
      toast.error("Digite ou fale um comando para a campanha.");
      return;
    }
    setIsGeneratingMcp(true);
    try {
      const targetStoreId = storeTargets?.storeId || campaigns[0]?.store_id || undefined;
      const res = await executeMcpTool({
        data: {
          tool: "generate_ad_campaign_proposal",
          arguments: {
            prompt: promptToUse,
            storeId: targetStoreId,
          },
        },
      });

      if (res.status === "success" && res.content?.[0]?.data?.block) {
        setDynamicBlock(res.content[0].data.block);
        toast.success("Proposta de anúncio gerada com IA!");
      } else {
        const errMsg = res.content?.[0]?.text || "Não foi possível gerar a campanha.";
        toast.error(errMsg);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao conectar com assistente MCP.");
    } finally {
      setIsGeneratingMcp(false);
    }
  };

  // Estados da Toolbar Canônica
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dashboardOpen, setDashboardOpen] = useState(false);

  // Estados de Tráfego Pago Externo (Meta & Google)
  const [metaPixelId, setMetaPixelId] = useState(channelsSettings?.meta_ads?.pixel_id || "");
  const [metaAdAccountId, setMetaAdAccountId] = useState(channelsSettings?.meta_ads?.ad_account_id || "");
  const [googleConversionId, setGoogleConversionId] = useState(channelsSettings?.google_ads?.conversion_id || "");
  const [googleCustomerId, setGoogleCustomerId] = useState(channelsSettings?.google_ads?.customer_id || "");
  const [isSavingChannels, setIsSavingChannels] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState<string | null>(null);

  // Estados do Gerador UTM
  const [utmPath, setUtmPath] = useState("/");
  const [utmSource, setUtmSource] = useState<"meta_ads" | "google_ads" | "whatsapp" | "influencer">("meta_ads");
  const [utmCampaign, setUtmCampaign] = useState("promocao_primavera");
  const [utmMedium, setUtmMedium] = useState<"cpc" | "stories" | "feed" | "search">("cpc");
  const [generatedUtmUrl, setGeneratedUtmUrl] = useState("");
  const [isGeneratingUtm, setIsGeneratingUtm] = useState(false);

  // Estado do Sheet Lateral de Criação Rápida (Profundidade 3)
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formHeadline, setFormHeadline] = useState("");
  const [formFormat, setFormFormat] = useState<string>("post_patrocinado");
  const [formMediaUrl, setFormMediaUrl] = useState<string>("");
  const [formLocation, setFormLocation] = useState("Centro Comercial");
  const [formRadiusKm, setFormRadiusKm] = useState(15);
  const [formDailyCents, setFormDailyCents] = useState(2000); // R$ 20,00
  const [formTotalCents, setFormTotalCents] = useState(10000); // R$ 100,00
  const [formObjective, setFormObjective] = useState<"whatsapp_leads" | "direct_sales" | "brand_awareness">("whatsapp_leads");

  // Métricas Consolidadas
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const totalImpressions = safeCampaigns.reduce((acc, c) => acc + (c?.impressions_count || 0), 0);
  const totalClicks = safeCampaigns.reduce((acc, c) => acc + (c?.clicks_count || 0), 0);
  const totalSpent = safeCampaigns.reduce((acc, c) => acc + (c?.spent_cents || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  const activeCount = safeCampaigns.filter((c) => c?.status === "active").length;
  const pausedCount = safeCampaigns.filter((c) => c?.status === "paused").length;

  const tabs: WorkspaceToolbarTab[] = [
    { id: "all", label: "Todas", count: safeCampaigns.length },
    { id: "active", label: "Veiculando", count: activeCount },
    { id: "paused", label: "Pausadas", count: pausedCount },
    { id: "meta_ads", label: "Meta Ads e Instagram" },
    { id: "google_ads", label: "Google Ads e Shopping" },
    { id: "utm_builder", label: "Gerador de Links UTM" },
  ];

  const filteredCampaigns = useMemo(() => {
    return safeCampaigns.filter((c) => {
      if (!c) return false;
      if (activeTab === "active" && c.status !== "active") return false;
      if (activeTab === "paused" && c.status !== "paused") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (c.title || "").toLowerCase().includes(q);
        const matchesLocation = (c.target_location || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesLocation) return false;
      }
      return true;
    });
  }, [safeCampaigns, activeTab, searchQuery]);

  const dashboardMetrics: MetricCardItem[] = [
    {
      id: "impressions",
      label: "Impressões Totais",
      value: totalImpressions.toLocaleString("pt-BR"),
      description: "Pessoas únicas alcançadas nas vitrines e feed",
      icon: Eye,
      variant: "primary",
    },
    {
      id: "clicks",
      label: "Cliques no Anúncio",
      value: totalClicks.toLocaleString("pt-BR"),
      description: "Interações de conversão em compras ou WhatsApp",
      icon: TrendingUp,
      variant: "success",
    },
    {
      id: "ctr",
      label: "CTR Médio",
      value: `${avgCtr}%`,
      description: "Taxa de clique sobre impressões geradas",
      icon: Percent,
      variant: "info",
    },
    {
      id: "spent",
      label: "Investimento Total",
      value: formatMoney(totalSpent),
      description: "Saldo consumido em campanhas ativas e encerradas",
      icon: DollarSign,
      variant: "warning",
    },
  ];

  const handleToggle = async (c: AdCampaign) => {
    const newStatus = c.status === "active" ? "paused" : "active";
    setUpdatingId(c.id);
    try {
      await toggleAdCampaignStatus({ data: { campaignId: c.id, status: newStatus } });
      setCampaigns((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, status: newStatus } : item)),
      );
      toast.success(newStatus === "active" ? "Campanha ativada!" : "Campanha pausada.");
    } catch {
      toast.error("Erro ao alterar status da campanha.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Informe o nome da campanha.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdCampaign({
        data: {
          title: formTitle.trim(),
          headline: formHeadline.trim() || undefined,
          format: formFormat as any,
          media_url: formMediaUrl || undefined,
          target_location: formLocation.trim() || "Toda a Região",
          target_radius_km: formRadiusKm,
          daily_budget_cents: formDailyCents,
          total_budget_cents: formTotalCents,
          objective: formObjective,
          destination_type: formObjective === "whatsapp_leads" ? "whatsapp" : "product",
        },
      });
      toast.success("Campanha criada e ativada com sucesso!");
      setQuickCreateOpen(false);
      setFormTitle("");
      setFormHeadline("");
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar campanha rápida.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentFormatConfig = QUICK_FORMATS.find((f) => f.id === formFormat) || QUICK_FORMATS[0];

  return (
    <NicheOperationalGuard requiredNiches={[]}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ── TOOLBAR CANÔNICA SOBERANA Waesy ── */}
        <WorkspaceCanonicalToolbar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(nextTab: string) => {
            if ((nextTab === "meta_ads" || nextTab === "google_ads") && !tierStatus?.isMaxUnlocked) {
              setMaxUpsellOpen(true);
              return;
            }
            setActiveTab(nextTab);
          }}
          searchPlaceholder="Buscar anúncio por título ou região..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenDashboard={() => setDashboardOpen(true)}
          dashboardButtonLabel="Métricas de Alcance"
          primaryAction={{
            label: "Novo Anúncio",
            icon: Plus,
            onClick: () => setQuickCreateOpen(true),
          }}
        />

        {/* ── FASE 4: DASHBOARD DE ROI & TELEMETRIA FECHADA (V125 + V139 + V141) ── */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold">
                  Retorno Auditado
                </Badge>
                <Badge variant={tierStatus?.isMaxUnlocked ? "default" : "secondary"} className="text-[10px]">
                  Tier {String(tierStatus?.planTier || "free").toUpperCase()} {tierStatus?.boostDiscountPercent ? `(-${tierStatus.boostDiscountPercent}% no Boost)` : ""}
                </Badge>
              </div>
              <h2 className="text-base font-bold text-foreground">
                {roiMetrics?.headlineProof || "Este impulsionamento gerou R$ 0,00 em pedidos (ROI 0%)"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {roiMetrics?.subProof || "Cruzamento determinístico entre Telemetria de Cliques (V125), Checkout (V139) e Faturas (V141)."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!tierStatus?.isMaxUnlocked && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMaxUpsellOpen(true)}
                  className="h-11 rounded-xl text-xs font-semibold gap-1.5"
                >
                  <Lock className="size-3.5" />
                  Desbloquear Tráfego Externo
                </Button>
              )}
            </div>
          </div>

          {/* ── FASE 3: AI AD BUILDER (2 CLIQUES DO CATÁLOGO PARA META/GOOGLE/VITRINE) ── */}
          <div className="pt-3 border-t border-border/40 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs font-semibold">Gerador de Criativo por Catálogo</Label>
              <Select
                value={selectedCatalogItemId}
                onValueChange={(v) => setSelectedCatalogItemId(v)}
              >
                <SelectTrigger className="h-11 rounded-xl bg-background text-xs">
                  <SelectValue placeholder="Selecione um item do catálogo para gerar copy e arte..." />
                </SelectTrigger>
                <SelectContent>
                  {(storeTargets?.products || []).map((prod: any) => (
                    <SelectItem key={prod.id} value={prod.id} className="text-xs">
                      {prod.title} — {formatMoney(prod.price_cents || 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={isGeneratingAiCreative}
              onClick={async () => {
                if (!tierStatus?.isMaxUnlocked) {
                  setMaxUpsellOpen(true);
                  return;
                }
                const targetId = selectedCatalogItemId || storeTargets?.products?.[0]?.id;
                if (!targetId) {
                  toast.error("Cadastre ao menos um produto publicado no catálogo.");
                  return;
                }
                setIsGeneratingAiCreative(true);
                try {
                  const res = await generateAiAdCreativeFromCatalog({
                    data: {
                      itemType: "product",
                      itemId: targetId,
                      platform: activeTab === "google_ads" ? "google_search" : "meta_instagram",
                    },
                  });
                  setAiCreativePreview(res);
                  toast.success("Criativo estruturado e Canvas 1080p prontos para publicação.");
                } catch (err: any) {
                  toast.error(err?.message || "Falha ao gerar criativo.");
                } finally {
                  setIsGeneratingAiCreative(false);
                }
              }}
              className="h-11 rounded-xl text-xs font-semibold px-4"
            >
              {isGeneratingAiCreative ? "Processando..." : "1. Gerar Anúncio do Catálogo"}
            </Button>
            {aiCreativePreview && (
              <Button
                size="sm"
                disabled={isPublishingExternal}
                onClick={async () => {
                  setIsPublishingExternal(true);
                  try {
                    const pub = await dispatchExternalMetaOrGoogleCampaign({
                      data: {
                        platform: activeTab === "google_ads" ? "google_ads" : "meta_ads",
                        campaignTitle: aiCreativePreview.creative.headline,
                        dailyBudgetCents: aiCreativePreview.creative.suggestedDailyBudgetCents || 2500,
                        durationDays: 7,
                        productId: aiCreativePreview.itemId,
                        headline: aiCreativePreview.creative.headline,
                        bodyCopy: aiCreativePreview.creative.bodyCopy,
                        callToAction: aiCreativePreview.creative.callToActionLabel,
                        imageUrl: aiCreativePreview.imageUrl || undefined,
                        destinationUrl: aiCreativePreview.destinationUrl,
                      },
                    });
                    toast.success(`Campanha publicada (${pub.externalApiStatus}) e debitada no Invoice Ledger!`);
                    setAiCreativePreview(null);
                    router.invalidate();
                  } catch (err: any) {
                    toast.error(err?.message || "Erro ao publicar campanha.");
                  } finally {
                    setIsPublishingExternal(false);
                  }
                }}
                className="h-11 rounded-xl text-xs font-bold px-4"
              >
                {isPublishingExternal ? "Publicando..." : "2. Publicar Campanha Agora"}
              </Button>
            )}
          </div>

          {aiCreativePreview && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Headline Estruturada</span>
                <p className="text-xs font-bold text-foreground">{aiCreativePreview.creative.headline}</p>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block pt-1">Canvas Spec</span>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {aiCreativePreview.canvasSpec.width}x{aiCreativePreview.canvasSpec.height} ({aiCreativePreview.canvasSpec.aspectRatio}) • {aiCreativePreview.priceFormatted}
                </p>
              </div>
              <div className="md:col-span-2 space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Copy Persuasiva</span>
                <p className="text-xs text-foreground leading-relaxed">{aiCreativePreview.creative.bodyCopy}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── SHEET SILENCIOSO DE UPSELL WAESY MAX (FASE 2 MAX TIER GATE) ── */}
        <Sheet open={maxUpsellOpen} onOpenChange={setMaxUpsellOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl max-w-xl mx-auto p-6 space-y-5">
            <SheetHeader className="space-y-1 text-left">
              <Badge variant="default" className="w-fit text-[10px]">Exclusivo Waesy Max</Badge>
              <SheetTitle className="text-lg font-bold">Tráfego Externo e Automação</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Conecte Meta Ads e Google Ads via OAuth 2.0, gere anúncios direto do seu catálogo e receba 50% de subsídio em todos os destaques internos da vitrine.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                <span className="font-medium">Integração Direta Meta Graph API & Google Ads</span>
                <Badge variant="outline" className="text-[10px]">Incluído</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                <span className="font-medium">Desconto em Impulsionamentos na Vitrine Waesy</span>
                <Badge variant="outline" className="text-[10px]">50% OFF</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                <span className="font-medium">Criador de Campanhas em 2 Cliques + ROI Fechado</span>
                <Badge variant="outline" className="text-[10px]">Incluído</Badge>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setMaxUpsellOpen(false)} className="h-11 rounded-xl text-xs">
                Agora não
              </Button>
              <Button
                size="sm"
                disabled={isUpgradingMax}
                onClick={async () => {
                  setIsUpgradingMax(true);
                  try {
                    const res = await upgradeStoreToWaesyMax();
                    if (res?.success) {
                      setTierStatus((prev: any) => ({ ...prev, planTier: "max", isMaxUnlocked: true, boostDiscountPercent: 50 }));
                      setMaxUpsellOpen(false);
                      toast.success("Waesy Max ativado! Comportas de tráfego externo liberadas.");
                      router.invalidate();
                    }
                  } catch (e: any) {
                    toast.error(e?.message || "Erro ao ativar Waesy Max.");
                  } finally {
                    setIsUpgradingMax(false);
                  }
                }}
                className="h-11 rounded-xl text-xs font-bold px-5"
              >
                {isUpgradingMax ? "Ativando..." : "Ativar Waesy Max (R$ 99/mês)"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* ── CONDICIONAL: META ADS & INSTAGRAM ── */}
        {activeTab === "meta_ads" && (
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Meta Ads</h3>
                  <Badge variant={channelsSettings?.meta_ads?.connected ? "default" : "secondary"} className="text-[10px]">
                    {channelsSettings?.meta_ads?.connected ? "Integrado" : "Pendente"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sincronização de catálogo de produtos com o Gerenciador de Comércio do Facebook e Pixel CAPI.
                </p>
              </div>
            </div>

            {/* Feed XML/CSV de Produtos */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Globe className="size-3.5 text-primary" />
                  Feed de Produtos para o Meta Catalog (CSV Oficial)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!channelsSettings?.meta_ads?.catalog_feed_url) return;
                    navigator.clipboard.writeText(channelsSettings.meta_ads.catalog_feed_url);
                    setCopiedFeed("meta");
                    toast.success("URL do Catálogo Meta copiada!");
                    setTimeout(() => setCopiedFeed(null), 2000);
                  }}
                  className="h-7 text-xs gap-1"
                >
                  {copiedFeed === "meta" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>{copiedFeed === "meta" ? "Copiado" : "Copiar Feed URL"}</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cole este link no Gerenciador de Comércio do Meta (Catálogo &gt; Fontes de Dados &gt; Carregamento por Feed Programado).
              </p>
              <div className="p-2 rounded-lg bg-background font-mono text-[10px] text-muted-foreground break-all border">
                {channelsSettings?.meta_ads?.catalog_feed_url || "Carregando feed..."}
              </div>
            </div>

            {/* Form de Configuração Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Pixel ID do Meta (Facebook / Instagram)</Label>
                <Input
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value)}
                  placeholder="Ex: 123456789012345"
                  className="h-9 rounded-xl bg-background text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ID da Conta de Anúncios (Ad Account ID)</Label>
                <Input
                  value={metaAdAccountId}
                  onChange={(e) => setMetaAdAccountId(e.target.value)}
                  placeholder="Ex: act_123456789"
                  className="h-9 rounded-xl bg-background text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">OAuth 2.0 Access Token (Meta Business Graph API)</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={oauthTokenInput}
                    onChange={(e) => setOauthTokenInput(e.target.value)}
                    placeholder="EAABsbCS1iHgBO..."
                    className="h-11 rounded-xl bg-background text-xs font-mono flex-1"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!metaAdAccountId || !oauthTokenInput) {
                        toast.error("Preencha o Ad Account ID e o Token OAuth 2.0.");
                        return;
                      }
                      try {
                        await connectExternalAdAccountOAuth({
                          data: {
                            platform: "meta_ads",
                            accountId: metaAdAccountId,
                            accountName: "Meta Business Account",
                            oauthAccessToken: oauthTokenInput,
                            pixelOrConversionId: metaPixelId,
                          },
                        });
                        toast.success("Conta Meta Ads vinculada via OAuth 2.0!");
                        setOauthTokenInput("");
                        router.invalidate();
                      } catch (err: any) {
                        toast.error(err?.message || "Falha ao vincular OAuth Meta.");
                      }
                    }}
                    className="h-11 rounded-xl text-xs font-semibold px-4"
                  >
                    Conectar OAuth 2.0
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                disabled={isSavingChannels}
                onClick={async () => {
                  setIsSavingChannels(true);
                  try {
                    await saveStoreAdChannelsSettings({
                      data: {
                        meta_pixel_id: metaPixelId,
                        meta_ad_account_id: metaAdAccountId,
                      },
                    });
                    toast.success("Configurações do Meta Ads salvas com sucesso!");
                    router.invalidate();
                  } catch (e: any) {
                    toast.error(e?.message || "Erro ao salvar Meta Ads.");
                  } finally {
                    setIsSavingChannels(false);
                  }
                }}
                className="rounded-xl text-xs font-semibold px-4"
              >
                {isSavingChannels ? "Salvando..." : "Salvar Configurações Meta"}
              </Button>
            </div>
          </div>
        )}

        {/* ── CONDICIONAL: GOOGLE ADS & SHOPPING ── */}
        {activeTab === "google_ads" && (
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Google Ads e Merchant Center</h3>
                  <Badge variant={channelsSettings?.google_ads?.connected ? "default" : "secondary"} className="text-[10px]">
                    {channelsSettings?.google_ads?.connected ? "Integrado" : "Pendente"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Feed XML compatível com Google Merchant Center para anúncios de Shopping e Performance Max.
                </p>
              </div>
            </div>

            {/* Feed XML do Google Merchant */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Globe className="size-3.5 text-primary" />
                  Feed XML para o Google Merchant Center (RSS 2.0 Oficial)
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!channelsSettings?.google_ads?.merchant_feed_url) return;
                    navigator.clipboard.writeText(channelsSettings.google_ads.merchant_feed_url);
                    setCopiedFeed("google");
                    toast.success("URL do Feed Google copiada!");
                    setTimeout(() => setCopiedFeed(null), 2000);
                  }}
                  className="h-7 text-xs gap-1"
                >
                  {copiedFeed === "google" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>{copiedFeed === "google" ? "Copiado" : "Copiar Feed XML"}</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cole este link no Google Merchant Center (Produtos &gt; Feeds &gt; Adicionar Feed &gt; Busca Programada).
              </p>
              <div className="p-2 rounded-lg bg-background font-mono text-[10px] text-muted-foreground break-all border">
                {channelsSettings?.google_ads?.merchant_feed_url || "Carregando feed..."}
              </div>
            </div>

            {/* Form de Configuração Google */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ID de Conversão Google / GTM</Label>
                <Input
                  value={googleConversionId}
                  onChange={(e) => setGoogleConversionId(e.target.value)}
                  placeholder="Ex: AW-123456789 ou GTM-XXXXXX"
                  className="h-9 rounded-xl bg-background text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ID de Cliente do Google Ads (Customer ID)</Label>
                <Input
                  value={googleCustomerId}
                  onChange={(e) => setGoogleCustomerId(e.target.value)}
                  placeholder="Ex: 123-456-7890"
                  className="h-9 rounded-xl bg-background text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                disabled={isSavingChannels}
                onClick={async () => {
                  setIsSavingChannels(true);
                  try {
                    await saveStoreAdChannelsSettings({
                      data: {
                        google_conversion_id: googleConversionId,
                        google_customer_id: googleCustomerId,
                      },
                    });
                    toast.success("Configurações do Google Ads salvas com sucesso!");
                    router.invalidate();
                  } catch (e: any) {
                    toast.error(e?.message || "Erro ao salvar Google Ads.");
                  } finally {
                    setIsSavingChannels(false);
                  }
                }}
                className="rounded-xl text-xs font-semibold px-4"
              >
                {isSavingChannels ? "Salvando..." : "Salvar Configurações Google"}
              </Button>
            </div>
          </div>
        )}

        {/* ── CONDICIONAL: GERADOR DE LINKS UTM ── */}
        {activeTab === "utm_builder" && (
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-6 shadow-xs">
            <div className="border-b border-border/40 pb-4">
              <h3 className="text-base font-bold text-foreground">Gerador de Links Rastreados (Parâmetros UTM)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Construa URLs parametrizadas para anúncios no Instagram, TikTok, Google ou parcerias com influenciadores.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Página de Destino</Label>
                <Input
                  value={utmPath}
                  onChange={(e) => setUtmPath(e.target.value)}
                  placeholder="Ex: / ou /produto/vestido"
                  className="h-9 rounded-xl bg-background text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Origem do Tráfego (utm_source)</Label>
                <Select value={utmSource} onValueChange={(v) => setUtmSource(v as any)}>
                  <SelectTrigger className="h-9 rounded-xl bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta_ads">Meta Ads (Instagram / Facebook)</SelectItem>
                    <SelectItem value="google_ads">Google Ads</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp Direto</SelectItem>
                    <SelectItem value="influencer">Influenciador / Parceria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome da Campanha (utm_campaign)</Label>
                <Input
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="Ex: verao_2026"
                  className="h-9 rounded-xl bg-background text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mídia / Posicionamento (utm_medium)</Label>
                <Select value={utmMedium} onValueChange={(v) => setUtmMedium(v as any)}>
                  <SelectTrigger className="h-9 rounded-xl bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpc">CPC (Anúncio Pago)</SelectItem>
                    <SelectItem value="stories">Stories</SelectItem>
                    <SelectItem value="feed">Feed</SelectItem>
                    <SelectItem value="search">Search (Busca)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-start">
              <Button
                size="sm"
                disabled={isGeneratingUtm}
                onClick={async () => {
                  setIsGeneratingUtm(true);
                  try {
                    const res = await generateUtmTrackingLink({
                      data: {
                        targetPath: utmPath,
                        source: utmSource,
                        campaignName: utmCampaign,
                        medium: utmMedium,
                      },
                    });
                    setGeneratedUtmUrl(res.trackingUrl);
                    toast.success("Link UTM gerado!");
                  } catch (e: any) {
                    toast.error(e?.message || "Erro ao gerar link.");
                  } finally {
                    setIsGeneratingUtm(false);
                  }
                }}
                className="rounded-xl text-xs font-semibold px-4"
              >
                Gerar Link Rastreado
              </Button>
            </div>

            {generatedUtmUrl && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Link Pronto para o Anúncio</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedUtmUrl);
                      toast.success("Link copiado para a área de transferência!");
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Copy className="size-3" />
                    <span>Copiar Link</span>
                  </Button>
                </div>
                <div className="p-2 rounded-lg bg-background font-mono text-[11px] text-foreground break-all border">
                  {generatedUtmUrl}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LISTA DE CAMPANHAS DE ANÚNCIOS LOCAIS ── */}
        {["all", "active", "paused"].includes(activeTab) && (
        <>
        {/* ── ASSISTENTE IA & PROTOCOLO MCP AD-TECH ── */}
        <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Wand2 className="size-3.5" />
              </div>
              <span className="text-xs font-bold text-foreground">
                Criador de Anúncios com IA (Protocolo MCP)
              </span>
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono text-muted-foreground border-border/60">
                Linguagem Natural e Voz
              </Badge>
            </div>
            {dynamicBlock && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDynamicBlock(null)}
                className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2"
              >
                Fechar Prévia
              </Button>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGenerateMcp();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Input
                value={mcpPrompt}
                onChange={(e) => setMcpPrompt(e.target.value)}
                placeholder="Ex: Cria anúncio no Instagram de R$ 50/dia para a Oktoberfest..."
                disabled={isGeneratingMcp}
                className="h-11 rounded-xl text-xs bg-muted/20 border-border/60 pr-10 focus-visible:ring-1"
              />
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isListeningVoice ? "Parar de ouvir" : "Falar comando por voz"}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                  isListeningVoice
                    ? "bg-rose-500 text-white animate-pulse"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {isListeningVoice ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
            </div>

            <Button
              type="submit"
              disabled={isGeneratingMcp || !mcpPrompt.trim()}
              className="h-11 px-4 rounded-xl text-xs font-semibold gap-1.5 shrink-0"
            >
              {isGeneratingMcp ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span className="hidden sm:inline">Gerando...</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span className="hidden sm:inline">Gerar Anúncio</span>
                </>
              )}
            </Button>
          </form>

          {/* Sugestões Rápidas de Prompt em 1 Toque */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <span className="text-[11px] font-medium text-muted-foreground shrink-0 mr-1">
              Sugestões:
            </span>
            {[
              "🍺 Especial Oktoberfest de R$ 50/dia",
              "🔥 Promoção Relâmpago de R$ 30/dia",
              "📍 Anúncio no Bairro de R$ 20/dia",
              "🛍️ Destaque dos Melhores Produtos no Instagram",
            ].map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => {
                  setMcpPrompt(sug);
                  handleGenerateMcp(sug);
                }}
                disabled={isGeneratingMcp}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-lg border border-border/60 bg-muted/10 hover:bg-muted/30 text-foreground transition-colors cursor-pointer shrink-0"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* ── PRÉVIA REALISTA DO BLOCO DINÂMICO GERADO VIA MCP ── */}
        {dynamicBlock && (
          <CampaignDynamicBlock
            block={dynamicBlock}
            onApproved={async () => {
              setDynamicBlock(null);
              toast.success("Campanha integrada ao servidor e veiculada!");
              await router.invalidate();
            }}
            onDismiss={() => setDynamicBlock(null)}
          />
        )}

        
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
          <div className="p-4 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Campanhas Veiculadas ({filteredCampaigns.length})
              </h2>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium shrink-0">
                <Link to="/workspace/marketing/pixels">
                  Pixels CAPI
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium shrink-0">
                <Link to="/workspace/integracoes/marketplaces">
                  Marketplaces
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium shrink-0">
                <Link to="/workspace/marketing/afiliados">
                  Afiliados
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground shrink-0"
              >
                <Link to="/workspace/marketing/anuncios/novo">
                  <Sliders className="size-3.5 mr-1" />
                  <span>Editor Completo</span>
                </Link>
              </Button>
            </div>
          </div>

          {filteredCampaigns.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Megaphone className="size-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">Nenhuma campanha encontrada</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Lance anúncios direcionados para atrair clientes no feed comunitário, stories e nas
                buscas locais em 3 toques.
              </p>
              <Button
                size="sm"
                onClick={() => setQuickCreateOpen(true)}
                className="rounded-xl mt-2 h-11 px-5 font-bold min-h-[44px]"
              >
                <Plus className="size-4 mr-1.5" />
                Criar Anúncio Rápido
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={c.status === "active" ? "default" : "secondary"}
                        className="text-[10px] rounded-md font-bold px-2 py-0.5 uppercase tracking-wider"
                      >
                        {c.status === "active" ? "Veiculando" : "Pausada"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] rounded-md font-medium px-2 py-0.5">
                        {FORMAT_LABELS[c.format] || c.format}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3 text-primary" />
                        {c.target_location} ({c.target_radius_km} km)
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground truncate">{c.title}</h3>

                    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground pt-1">
                      <span>
                        Diário:{" "}
                        <strong className="text-foreground font-tabular-nums">
                          {formatMoney(c.daily_budget_cents)}
                        </strong>
                      </span>
                      <span>
                        Gasto:{" "}
                        <strong className="text-foreground font-tabular-nums">
                          {formatMoney(c.spent_cents)}
                        </strong>
                      </span>
                      <span>
                        Cliques: <strong className="text-foreground font-tabular-nums">{c.clicks_count}</strong>
                      </span>
                      <span>
                        Impressões:{" "}
                        <strong className="text-primary font-bold font-tabular-nums">
                          {c.impressions_count.toLocaleString("pt-BR")}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={async () => {
                        setUpdatingId(c.id);
                        try {
                          await boostAdCampaignAtomic({
                            data: {
                              campaignId: c.id,
                              amountCents: 5000,
                              priorityDelta: 50,
                            },
                          });
                          toast.success("Boost ACID (+R$ 50,00) debitado no Ledger e prioridade sincronizada!");
                          router.invalidate();
                        } catch (err: any) {
                          toast.error(err?.message || "Erro ao impulsionar campanha.");
                        } finally {
                          setUpdatingId(null);
                        }
                      }}
                      disabled={updatingId === c.id}
                      className="rounded-xl text-xs font-bold gap-1.5 h-11 px-3.5 min-h-[44px]"
                    >
                      <Zap className="size-3.5" />
                      <span>Impulsionar</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(c)}
                      disabled={updatingId === c.id}
                      className="rounded-xl text-xs font-bold gap-1.5 h-11 px-4 min-h-[44px]"
                    >
                      {c.status === "active" ? (
                        <>
                          <Pause className="size-3.5" />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <Play className="size-3.5 text-primary" />
                          <span>Ativar</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir campanha"
                      onClick={async () => {
                        if (!confirm("Deseja realmente excluir esta campanha?")) return;
                        setUpdatingId(c.id);
                        try {
                          await deleteAdCampaign({ data: { campaignId: c.id } });
                          toast.success("Campanha excluída com sucesso.");
                          router.invalidate();
                        } catch (err: any) {
                          toast.error(err?.message || "Erro ao excluir campanha.");
                        } finally {
                          setUpdatingId(null);
                        }
                      }}
                      disabled={updatingId === c.id}
                      className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-11 min-h-[44px]"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
        )}

        {/* ── DASHBOARD SHEET EXECUTIVO ── */}
        <WorkspaceDashboardSheet
          open={dashboardOpen}
          onOpenChange={setDashboardOpen}
          title="Performance"
          description="Acompanhamento em tempo real de alcance, cliques e investimento publicitário."
          metrics={dashboardMetrics}
        />

        {/* ── SHEET LATERAL DE CRIAÇÃO RÁPIDA (EDIÇÃO EM PROFUNDIDADE 3) ── */}
        <Sheet open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
          <SheetContent size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] overflow-y-auto p-6 space-y-6">
            <SheetHeader className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Zap className="size-4" />
                </span>
                <SheetTitle className="text-base font-bold">Lançar Anúncio em 3 Toques</SheetTitle>
              </div>
              <SheetDescription className="text-xs text-muted-foreground">
                Configure o criativo, defina o orçamento e comece a veicular imediatamente.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleQuickCreate} className="space-y-5">
              {/* Formato */}
              <div className="space-y-2">
                <Label className="text-xs font-bold">Posicionamento do Anúncio</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {QUICK_FORMATS.map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setFormFormat(fmt.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        formFormat === fmt.id
                          ? "border-primary bg-primary/5 text-primary font-bold"
                          : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <p className="text-xs">{fmt.title}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Informações Básicas */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Título da Campanha</Label>
                  <Input
                    placeholder="Ex: Promoção de Quarta Feira"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    className="h-11 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Chamada / Headline</Label>
                  <Input
                    placeholder="Ex: Peça pelo WhatsApp com frete grátis"
                    value={formHeadline}
                    onChange={(e) => setFormHeadline(e.target.value)}
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Criativo da Imagem */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Imagem do Criativo</Label>
                <MediaUploader
                  value={formMediaUrl ? [formMediaUrl] : []}
                  onChange={(urls) => setFormMediaUrl(urls[0] || "")}
                  maxFiles={1}
                />
              </div>

              {/* Truthful Preview Compacto */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Eye className="size-3 text-primary" />
                    Prévia Real
                  </span>
                  <span>{currentFormatConfig.title}</span>
                </div>

                <div
                  className="w-full rounded-xl overflow-hidden bg-background border border-border/60 relative flex items-center justify-center"
                  style={{
                    aspectRatio: `${currentFormatConfig.aspect}`,
                    maxHeight: formFormat === "banner_destaque" ? "140px" : "200px",
                  }}
                >
                  {formMediaUrl ? (
                    <img
                      src={formMediaUrl}
                      alt="Prévia"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4 text-muted-foreground flex flex-col items-center gap-1">
                      <ImageIcon className="size-6 opacity-40" />
                      <span className="text-[10px]">Sem criativo enviado</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-foreground/80 text-background text-[8px] font-bold">
                      Patrocinado
                    </Badge>
                  </div>
                </div>

                <div className="text-xs space-y-0.5 pt-1">
                  <p className="font-bold text-foreground truncate">
                    {formHeadline || formTitle || "Título da chamada"}
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3" />
                    <span>{formLocation} ({formRadiusKm} km)</span>
                  </p>
                </div>
              </div>

              {/* Localização e Raio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Localidade</Label>
                  <Input
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Raio: {formRadiusKm} km</Label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={formRadiusKm}
                    onChange={(e) => setFormRadiusKm(Number(e.target.value))}
                    className="w-full h-11 accent-primary"
                  />
                </div>
              </div>

              {/* Orçamentos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Orçamento Diário</Label>
                  <CurrencyField
                    value={formDailyCents}
                    onChange={(val) => setFormDailyCents(val || 0)}
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Limite Total</Label>
                  <CurrencyField
                    value={formTotalCents}
                    onChange={(val) => setFormTotalCents(val || 0)}
                    className="h-11 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Botão de Ação */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl text-sm font-bold min-h-[44px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      <span>Ativando Campanha...</span>
                    </>
                  ) : (
                    <>
                      <Megaphone className="size-4 mr-2" />
                      <span>Publicar Anúncio Imediatamente</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </NicheOperationalGuard>
  );
}
