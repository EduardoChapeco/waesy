import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  TrendingUp,
  Eye,
  DollarSign,
  Play,
  Pause,
  MapPin,
  Percent,
  Zap,
  ExternalLink,
  MessageCircle,
  ShoppingBag,
  Target,
  Image as ImageIcon,
  Loader2,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyField } from "@/components/ui/currency-field";
import { MediaUploader } from "@/components/ui/media-uploader";
import { formatMoney } from "@/lib/money";
import {
  listAdCampaigns,
  toggleAdCampaignStatus,
  createAdCampaign,
  getStoreAdTargets,
  type AdCampaign,
} from "@/services/ads.functions";
import {
  WorkspaceCanonicalToolbar,
  type WorkspaceToolbarTab,
} from "@/components/workspace/workspace-canonical-toolbar";
import {
  WorkspaceDashboardSheet,
  type MetricCardItem,
} from "@/components/workspace/workspace-dashboard-sheet";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";

export const Route = createFileRoute("/workspace/marketing/anuncios")({
  head: () => ({ meta: [{ title: "Campanhas de Anúncios | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [campaigns, storeTargets] = await Promise.all([
        listAdCampaigns().catch(() => []),
        getStoreAdTargets().catch(() => ({ products: [], storePhone: null, storeSlug: "" })),
      ]);
      return { campaigns, storeTargets };
    } catch {
      return { campaigns: [], storeTargets: { products: [], storePhone: null, storeSlug: "" } };
    }
  },
  component: AnunciosWorkspacePage,
});

const FORMAT_LABELS: Record<string, string> = {
  post_patrocinado: "Post Patrocinado",
  banner_destaque: "Banner de Destaque",
  story_patrocinado: "Story Patrocinado",
  stories_sponsor: "Stories Imersivo",
  busca_topo: "Destaque na Busca",
};

const QUICK_FORMATS = [
  { id: "post_patrocinado", title: "Feed (1:1)", aspect: 1 },
  { id: "banner_destaque", title: "Banner (21:9)", aspect: 21 / 9 },
  { id: "story_patrocinado", title: "Story (9:16)", aspect: 9 / 16 },
] as const;

function AnunciosWorkspacePage() {
  const router = useRouter();
  const { campaigns: initialCampaigns, storeTargets } = ((Route.useLoaderData?.() as any) || {});
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(initialCampaigns);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Estados da Toolbar Canônica
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dashboardOpen, setDashboardOpen] = useState(false);

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
  const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions_count || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks_count || 0), 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + (c.spent_cents || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const pausedCount = campaigns.filter((c) => c.status === "paused").length;

  const tabs: WorkspaceToolbarTab[] = [
    { id: "all", label: "Todas", count: campaigns.length },
    { id: "active", label: "Veiculando", count: activeCount },
    { id: "paused", label: "Pausadas", count: pausedCount },
  ];

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (activeTab === "active" && c.status !== "active") return false;
      if (activeTab === "paused" && c.status !== "paused") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(q);
        const matchesLocation = c.target_location.toLowerCase().includes(q);
        if (!matchesTitle && !matchesLocation) return false;
      }
      return true;
    });
  }, [campaigns, activeTab, searchQuery]);

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
          onTabChange={setActiveTab}
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

        {/* ── LISTA DE CAMPANHAS DE ANÚNCIOS ── */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-xs">
          <div className="p-4 bg-muted/20 flex items-center justify-between border-b border-border/40">
            <div className="flex items-center gap-2">
              <Megaphone className="size-4 text-primary" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Campanhas Veiculadas ({filteredCampaigns.length})
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium">
                <Link to="/workspace/marketing/pixels">
                  Pixels CAPI
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium">
                <Link to="/workspace/integracoes/marketplaces">
                  Marketplaces
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs font-medium">
                <Link to="/workspace/marketing/afiliados">
                  Afiliados & Saques
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground"
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── DASHBOARD SHEET EXECUTIVO ── */}
        <WorkspaceDashboardSheet
          open={dashboardOpen}
          onOpenChange={setDashboardOpen}
          title="Performance de Marketing & Tráfego"
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
