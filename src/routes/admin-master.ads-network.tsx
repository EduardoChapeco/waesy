import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Zap, TrendingUp, DollarSign, Radio, ExternalLink, Layers, Search, CheckCircle2, Clock, PauseCircle, PlayCircle, Play, Pause, Building2, Sliders, ShieldCheck, Settings, Star, Globe, Instagram, BookOpen, ArrowDownLeft, ArrowUpRight, Filter, X } from "lucide-react";
import { getAdNetworkTreasuryMetrics, listAllNetworkCampaignsAdmin, getGlobalAdNetworkConfig, updateGlobalAdNetworkConfig, listAdLedgerEntries, toggleAdCampaignStatusAdmin } from "@/services/ads.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/admin-master/ads-network")({
  head: () => ({ meta: [{ title: "Ad-Tech Command Center e Arbitragem | Admin Master" }] }),
  loader: async () => {
    try {
      const [metrics, campaigns, globalConfig] = await Promise.all([
        getAdNetworkTreasuryMetrics().catch(() => null),
        listAllNetworkCampaignsAdmin({ data: { status: "all", limit: 50 } }).catch(() => []),
        getGlobalAdNetworkConfig().catch(() => null),
      ]);

      return {
        metrics: metrics || {
          total_processed_cents: 0,
          waesy_revenue_cents: 0,
          external_ad_spend_cents: 0,
          active_campaigns_count: 0,
          total_campaigns_count: 0,
        },
        initialCampaigns: campaigns || [],
        initialConfig: globalConfig || {
          take_rate: 0.20,
          meta_configured: false,
          meta_access_token_masked: "",
          meta_ad_account_id: "",
          meta_pixel_id: "",
          google_configured: false,
          google_developer_token_masked: "",
          google_customer_id: "",
        },
      };
    } catch (err) {
      console.error("[loader:admin-master.ads-network] Loader error:", err);
      return {
        metrics: {
          total_processed_cents: 0,
          waesy_revenue_cents: 0,
          external_ad_spend_cents: 0,
          active_campaigns_count: 0,
          total_campaigns_count: 0,
        },
        initialCampaigns: [],
        initialConfig: {
          take_rate: 0.20,
          meta_configured: false,
          meta_access_token_masked: "",
          meta_ad_account_id: "",
          meta_pixel_id: "",
          google_configured: false,
          google_developer_token_masked: "",
          google_customer_id: "",
        },
      };
    }
  },
  component: AdminAdsNetworkPage,
});

function AdminAdsNetworkPage() {
  const { metrics: initialMetrics, initialCampaigns, initialConfig } = (Route.useLoaderData?.() as any) || {};
  const queryClient = useQueryClient();

  const [activeViewTab, setActiveViewTab] = useState<"campaigns" | "ledger">("campaigns");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "completed">("all");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>("all");
  const [selectedCampaignForLedger, setSelectedCampaignForLedger] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Form states para o Hub de Integração
  const [takeRateInput, setTakeRateInput] = useState(20);
  const [metaTokenInput, setMetaTokenInput] = useState("");
  const [metaAdAccountInput, setMetaAdAccountInput] = useState("");
  const [metaPixelInput, setMetaPixelInput] = useState("");
  const [googleDevTokenInput, setGoogleDevTokenInput] = useState("");
  const [googleCustomerInput, setGoogleCustomerInput] = useState("");

  const { data: metrics } = useQuery({
    queryKey: ["admin-ads-metrics"],
    queryFn: () => getAdNetworkTreasuryMetrics(),
    initialData: initialMetrics,
    refetchInterval: 15_000,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["admin-ads-campaigns", statusFilter],
    queryFn: () => listAllNetworkCampaignsAdmin({ data: { status: statusFilter, limit: 50 } }),
    initialData: initialCampaigns,
    refetchInterval: 15_000,
  });

  const { data: globalConfig } = useQuery({
    queryKey: ["admin-global-ad-config"],
    queryFn: () => getGlobalAdNetworkConfig(),
    initialData: initialConfig,
    refetchInterval: 30_000,
  });

  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ["admin-ad-ledger", selectedCampaignForLedger],
    queryFn: () => listAdLedgerEntries({ data: { campaignId: selectedCampaignForLedger || undefined, limit: 100 } }),
    enabled: activeViewTab === "ledger" || !!selectedCampaignForLedger,
    refetchInterval: 15_000,
  });

  const toggleCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, status }: { campaignId: string; status: "active" | "paused" | "completed" }) => {
      return await toggleAdCampaignStatusAdmin({ data: { campaignId, status } });
    },
    onSuccess: (_, variables) => {
      toast.success(variables.status === "active" ? "Campanha ativada na rede!" : "Campanha pausada.");
      queryClient.invalidateQueries({ queryKey: ["admin-ads-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ads-metrics"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao alterar status da campanha.");
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      return await updateGlobalAdNetworkConfig({
        data: {
          take_rate: Number(takeRateInput) / 100,
          meta_access_token: metaTokenInput || undefined,
          meta_ad_account_id: metaAdAccountInput || undefined,
          meta_pixel_id: metaPixelInput || undefined,
          google_developer_token: googleDevTokenInput || undefined,
          google_customer_id: googleCustomerInput || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Credenciais da Ad-Network atualizadas com sucesso!");
      setIsConfigModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-global-ad-config"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ads-metrics"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar credenciais.");
    },
  });

  const handleOpenConfig = () => {
    if (globalConfig) {
      setTakeRateInput(Math.round((globalConfig.take_rate || 0.20) * 100));
      setMetaAdAccountInput(globalConfig.meta_ad_account_id || "");
      setMetaPixelInput(globalConfig.meta_pixel_id || "");
      setGoogleCustomerInput(globalConfig.google_customer_id || "");
      setMetaTokenInput("");
      setGoogleDevTokenInput("");
    }
    setIsConfigModalOpen(true);
  };

  const filteredCampaigns = (campaigns || []).filter((c: any) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      c.title?.toLowerCase().includes(term) ||
      c.store_name?.toLowerCase().includes(term)
    );
  });

  const filteredLedger = (ledgerEntries || []).filter((entry: any) => {
    if (ledgerTypeFilter !== "all" && entry.entry_type !== ledgerTypeFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      entry.description?.toLowerCase().includes(term) ||
      entry.routing_mode?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-24 px-0 sm:px-6 animate-in fade-in duration-200">
      {/* ── 1. Header do Command Center ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40 px-4 sm:px-0 pt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Ad-Network Command Center
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
              <Zap className="size-3" /> Arbitragem {Math.round((globalConfig?.take_rate ?? 0.20) * 100)}/{(100 - Math.round((globalConfig?.take_rate ?? 0.20) * 100))}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gestão da câmara de compensação de anúncios pagos e distribuição de tráfego Meta e Google.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-lg text-xs font-semibold h-9 px-4">
            <Link to="/admin-master/boost-payments">
              <DollarSign className="size-3.5 mr-1 text-emerald-600" />
              Pagamentos Boost
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenConfig}
            className="rounded-lg text-xs font-semibold h-9 px-4 cursor-pointer"
          >
            <Sliders className="size-3.5 mr-1 text-primary" />
            Configurar Hub Ads
          </Button>
        </div>
      </div>

      {/* ── 2. Bento Grid de Métricas de Tesouraria ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4 sm:px-0">
        {/* KPI 1: Volume Processado */}
        <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Volume Total Processado</span>
            <DollarSign className="size-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {formatMoney(metrics?.total_processed_cents || 0)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Total bruto transacionado em impulsionamento de anúncios.
          </p>
        </div>

        {/* KPI 2: Receita Waesy (Arbitragem) */}
        <div className="p-4 sm:p-5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            <span>Receita Waesy (Software Fee)</span>
            <TrendingUp className="size-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-emerald-700 dark:text-emerald-400">
            {formatMoney(metrics?.waesy_revenue_cents || 0)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Retenção de arbitragem ({Math.round((globalConfig?.take_rate ?? 0.20) * 100)}%) da rede Waesy Ads.
          </p>
        </div>

        {/* KPI 3: Injeção em APIs Externas (Meta/Google) */}
        <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Gasto em APIs (Meta / Google)</span>
            <ExternalLink className="size-4 text-primary" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {formatMoney(metrics?.external_ad_spend_cents || 0)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Budget injetado em leilão ({100 - Math.round((globalConfig?.take_rate ?? 0.20) * 100)}%) nas plataformas de tráfego.
          </p>
        </div>

        {/* KPI 4: Campanhas Ativas */}
        <div className="p-4 sm:p-5 rounded-lg border border-border/60 bg-card space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Campanhas Ativas</span>
            <Radio className="size-4 text-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-foreground">
            {metrics?.active_campaigns_count || 0}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              / {metrics?.total_campaigns_count || 0}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Campanhas rodando simultaneamente na malha comunitária.
          </p>
        </div>
      </div>

      {/* ── 3. Hub de Integração Global (Bento Card Spatial UI) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 sm:px-0">
        <div className="md:col-span-2 p-5 rounded-lg border border-border/60 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Sliders className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Hub de Integração Ad-Tech</h3>
                <p className="text-xs text-muted-foreground">Tokens globais e taxa de retenção da plataforma</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenConfig}
              className="rounded-lg text-xs font-semibold h-8.5 gap-2 cursor-pointer"
            >
              <Settings className="size-3.5" /> Configurar Credenciais
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Take Rate */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium">Taxa de Arbitragem</span>
              <p className="text-base font-bold font-mono text-foreground">
                {Math.round((globalConfig?.take_rate ?? 0.20) * 100)}% Waesy
              </p>
              <span className="text-[10px] text-muted-foreground block">
                {100 - Math.round((globalConfig?.take_rate ?? 0.20) * 100)}% injetado em leilão
              </span>
            </div>

            {/* Meta Marketing API */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Instagram className="size-3 text-pink-500" /> Meta Marketing API
              </span>
              <div className="flex items-center gap-2 pt-1">
                <span className={`size-2 rounded-full ${globalConfig?.meta_configured ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                <span className="text-xs font-semibold text-foreground">
                  {globalConfig?.meta_configured ? "Conectado" : "Não configurado"}
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground truncate block">
                {globalConfig?.meta_access_token_masked || "Token ausente"}
              </span>
            </div>

            {/* Google Ads API */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 space-y-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Globe className="size-3 text-blue-500" /> Google Ads API
              </span>
              <div className="flex items-center gap-2 pt-1">
                <span className={`size-2 rounded-full ${globalConfig?.google_configured ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                <span className="text-xs font-semibold text-foreground">
                  {globalConfig?.google_configured ? "Conectado" : "Não configurado"}
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground truncate block">
                {globalConfig?.google_developer_token_masked || "Dev Token ausente"}
              </span>
            </div>
          </div>
        </div>

        {/* Card de Regra de Desvio do Split Engine */}
        <div className="p-5 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Zap className="size-3.5 fill-current" /> Split Engine Server-Side
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Regra A:</strong> Clientes Pro com OAuth recebem 100% de injeção direta.<br />
              <strong>Regra B:</strong> No Express Boost, o Waesy retém {Math.round((globalConfig?.take_rate ?? 0.20) * 100)}% de taxa e injeta o saldo via API global.
            </p>
          </div>
          <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Webhook de Telemetria:</span>
            <span className="font-mono text-[10px] text-foreground">/api/webhooks/meta-ads</span>
          </div>
        </div>
      </div>

      {/* ── 4. Alternador de Visão: Campanhas vs Livro-Razão (Ad-Ledger) ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveViewTab("campaigns");
                setSelectedCampaignForLedger(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewTab === "campaigns"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radio className="size-3.5 inline mr-2" />
              Campanhas em Execução ({campaigns.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab("ledger")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewTab === "ledger"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookOpen className="size-3.5 inline mr-2" />
              Livro-Razão (Ad-Ledger)
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedCampaignForLedger && (
              <Badge variant="outline" className="text-[10px] font-mono gap-1 text-primary border-primary/30">
                Filtrado por campanha
                <button
                  type="button"
                  onClick={() => setSelectedCampaignForLedger(null)}
                  className="cursor-pointer ml-1 hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}

            <div className="relative flex-1 sm:w-64">
              <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={activeViewTab === "campaigns" ? "Filtrar por loja ou campanha..." : "Filtrar lançamentos..."}
                className="pl-8.5 h-9 rounded-lg text-base sm:text-xs"
              />
            </div>
          </div>
        </div>

        {/* ── ABA 1: TABELA DE CAMPANHAS ── */}
        {activeViewTab === "campaigns" && (
          <>
            {/* Mobile View: WhatsApp List Pattern */}
            <div className="block sm:hidden bg-card border-y border-border/40 divide-y divide-border/30">
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((c: any) => (
                  <div
                    key={c.id}
                    className="p-4 min-h-[56px] space-y-2 active:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="size-3 text-primary" />
                          {c.store_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={c.status === "active" ? "default" : "outline"}
                          className="text-[10px] px-2 py-1 capitalize"
                        >
                          {c.status === "active" ? "Rodando" : c.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleCampaignMutation.mutate({
                            campaignId: c.id,
                            status: c.status === "active" ? "paused" : "active",
                          })}
                          disabled={toggleCampaignMutation.isPending}
                          className="size-8 rounded-lg cursor-pointer"
                        >
                          {c.status === "active" ? <Pause className="size-3.5 text-amber-600" /> : <Play className="size-3.5 text-emerald-600" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                      <span className="text-muted-foreground font-mono">
                        Total: <strong className="text-foreground">{formatMoney(c.total_budget_cents)}</strong>
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Fee: {formatMoney(c.waesy_revenue_cents)}
                        </span>
                        <span className="text-muted-foreground">
                          API: {formatMoney(c.external_spend_cents)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCampaignForLedger(c.id);
                            setActiveViewTab("ledger");
                          }}
                          className="h-6 px-2 text-[10px] text-primary cursor-pointer"
                        >
                          Razão
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground px-4">
                  Nenhuma campanha ativa no momento.
                </div>
              )}
            </div>

            {/* Desktop View: Tabela Limpa */}
            <div className="hidden sm:block rounded-lg border border-border/60 overflow-hidden bg-card">
              <div className="divide-y divide-border/30">
                <div className="grid grid-cols-12 px-4 py-3 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="col-span-4">Campanha / Loja</span>
                  <span className="col-span-2">Roteamento</span>
                  <span className="col-span-2 text-right">Budget Total</span>
                  <span className="col-span-2 text-right">Receita Waesy ({Math.round((globalConfig?.take_rate ?? 0.20) * 100)}%)</span>
                  <span className="col-span-2 text-center">Status e Ações</span>
                </div>

                {filteredCampaigns.length > 0 ? (
                  filteredCampaigns.map((c: any) => (
                    <div
                      key={c.id}
                      className="grid grid-cols-12 px-4 py-4 items-center text-xs hover:bg-muted/20 transition-colors"
                    >
                      <div className="col-span-4 min-w-0 pr-3">
                        <p className="font-bold text-foreground truncate">{c.title}</p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                          {c.store_name} • Criado em {formatDate(c.created_at)}
                        </p>
                      </div>

                      <div className="col-span-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {c.routing_mode === "client_own_account" ? "Conta Própria" : "Waesy Arbitrage"}
                        </Badge>
                      </div>

                      <div className="col-span-2 text-right font-mono font-bold text-foreground">
                        {formatMoney(c.total_budget_cents)}
                      </div>

                      <div className="col-span-2 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        +{formatMoney(c.waesy_revenue_cents)}
                      </div>

                      <div className="col-span-2 flex items-center justify-center gap-2">
                        <Badge
                          variant={c.status === "active" ? "default" : "outline"}
                          className="text-[10px] px-2 py-1"
                        >
                          {c.status === "active" ? "Em Leilão" : c.status}
                        </Badge>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleCampaignMutation.mutate({
                            campaignId: c.id,
                            status: c.status === "active" ? "paused" : "active",
                          })}
                          disabled={toggleCampaignMutation.isPending}
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          title={c.status === "active" ? "Pausar campanha" : "Ativar campanha"}
                        >
                          {c.status === "active" ? <Pause className="size-3.5 text-amber-600" /> : <Play className="size-3.5 text-emerald-600" />}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCampaignForLedger(c.id);
                            setActiveViewTab("ledger");
                          }}
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Ver lançamentos contábeis no Ad-Ledger"
                        >
                          <BookOpen className="size-3.5 text-primary" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Nenhuma campanha registrada na Ad-Network.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── ABA 2: LIVRO-RAZÃO CONTÁBIL (AD-LEDGER) ── */}
        {activeViewTab === "ledger" && (
          <div className="space-y-3">
            {/* Filtros do Ledger */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Filtrar Lançamento:</span>
              <button
                type="button"
                onClick={() => setLedgerTypeFilter("all")}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  ledgerTypeFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                Todos ({ledgerEntries.length})
              </button>
              <button
                type="button"
                onClick={() => setLedgerTypeFilter("boost_payment")}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  ledgerTypeFilter === "boost_payment" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                Crédito Bruto (Cliente)
              </button>
              <button
                type="button"
                onClick={() => setLedgerTypeFilter("waesy_fee_retention")}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  ledgerTypeFilter === "waesy_fee_retention" ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                Retenção Software Fee
              </button>
              <button
                type="button"
                onClick={() => setLedgerTypeFilter("external_ad_spend")}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  ledgerTypeFilter === "external_ad_spend" ? "bg-sky-600 text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                Injeção em Leilão (Meta/Google)
              </button>
            </div>

            {/* Desktop Table do Ad-Ledger */}
            <div className="rounded-lg border border-border/60 overflow-hidden bg-card">
              <div className="divide-y divide-border/30">
                <div className="grid grid-cols-12 px-4 py-3 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="col-span-3">Data / Hora</span>
                  <span className="col-span-3">Tipo de Partida Dobrada</span>
                  <span className="col-span-4">Descrição do Lançamento</span>
                  <span className="col-span-2 text-right">Valor</span>
                </div>

                {filteredLedger.length > 0 ? (
                  filteredLedger.map((entry: any) => {
                    const isCredit = entry.entry_type === "boost_payment";
                    const isFee = entry.entry_type === "waesy_fee_retention";
                    const isSpend = entry.entry_type === "external_ad_spend";

                    return (
                      <div
                        key={entry.id}
                        className="grid grid-cols-12 px-4 py-3 items-center text-xs hover:bg-muted/20 transition-colors"
                      >
                        <div className="col-span-3 font-mono text-[11px] text-muted-foreground">
                          {formatDate(entry.created_at)}
                        </div>

                        <div className="col-span-3">
                          {isCredit && (
                            <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                              <ArrowDownLeft className="size-3 mr-1 inline" /> Recebimento Bruto
                            </Badge>
                          )}
                          {isFee && (
                            <Badge variant="outline" className="text-[10px] font-mono text-amber-600 border-amber-500/30 bg-amber-500/10">
                              <Zap className="size-3 mr-1 inline" /> Retenção Waesy ({Math.round((globalConfig?.take_rate ?? 0.20) * 100)}%)
                            </Badge>
                          )}
                          {isSpend && (
                            <Badge variant="outline" className="text-[10px] font-mono text-sky-600 border-sky-500/30 bg-sky-500/10">
                              <ArrowUpRight className="size-3 mr-1 inline" /> Injeção de Tráfego
                            </Badge>
                          )}
                        </div>

                        <div className="col-span-4 min-w-0 pr-2">
                          <p className="font-semibold text-foreground truncate">{entry.description}</p>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Modo: {entry.routing_mode}
                          </span>
                        </div>

                        <div className="col-span-2 text-right font-mono font-bold">
                          <span className={isSpend ? "text-sky-600 dark:text-sky-400" : isFee ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                            {isSpend ? "-" : "+"}{formatMoney(entry.amount_cents)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Nenhum lançamento contábil no livro-razão para os filtros selecionados.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Modal de Configuração de Credenciais Globais (Hub de Ads) ── */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="max-w-lg rounded-lg p-6 bg-card border border-border/70 shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              Configuração Global da Ad-Network
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure a taxa de arbitragem e as chaves de API globais utilizadas para comprar tráfego nos leilões da Meta e Google.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Taxa de Arbitragem */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">
                Taxa de Retenção Waesy (Take Rate %):
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={takeRateInput}
                  onChange={(e) => setTakeRateInput(Number(e.target.value))}
                  className="w-28 h-10 rounded-lg font-mono text-base font-bold"
                />
                <span className="text-xs text-muted-foreground">
                  {takeRateInput}% fica na tesouraria do Waesy, {100 - takeRateInput}% é injetado nas APIs externas.
                </span>
              </div>
            </div>

            {/* Meta Marketing API */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/40 space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Instagram className="size-3.5 text-pink-500" /> Credenciais Globais Meta Ads
              </span>

              <div className="space-y-2">
                <span className="text-[11px] text-muted-foreground font-medium">Meta Access Token (System User):</span>
                <Input
                  type="password"
                  placeholder={globalConfig?.meta_access_token_masked || "EAAB..."}
                  value={metaTokenInput}
                  onChange={(e) => setMetaTokenInput(e.target.value)}
                  className="h-10 rounded-lg text-base sm:text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Ad Account ID:</span>
                  <Input
                    placeholder="act_123456789"
                    value={metaAdAccountInput}
                    onChange={(e) => setMetaAdAccountInput(e.target.value)}
                    className="h-10 rounded-lg text-base sm:text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium">Pixel ID:</span>
                  <Input
                    placeholder="1234567890"
                    value={metaPixelInput}
                    onChange={(e) => setMetaPixelInput(e.target.value)}
                    className="h-10 rounded-lg text-base sm:text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Google Ads API */}
            <div className="p-4 rounded-lg bg-muted/20 border border-border/40 space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Globe className="size-3.5 text-blue-500" /> Credenciais Globais Google Ads
              </span>

              <div className="space-y-2">
                <span className="text-[11px] text-muted-foreground font-medium">Developer Token:</span>
                <Input
                  type="password"
                  placeholder={globalConfig?.google_developer_token_masked || "Dev Token"}
                  value={googleDevTokenInput}
                  onChange={(e) => setGoogleDevTokenInput(e.target.value)}
                  className="h-10 rounded-lg text-base sm:text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Customer ID:</span>
                <Input
                  placeholder="123-456-7890"
                  value={googleCustomerInput}
                  onChange={(e) => setGoogleCustomerInput(e.target.value)}
                  className="h-10 rounded-lg text-base sm:text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfigModalOpen(false)}
              className="rounded-lg h-10 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saveConfigMutation.isPending}
              onClick={() => saveConfigMutation.mutate()}
              className="rounded-lg h-10 px-5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
            >
              {saveConfigMutation.isPending ? "Salvando..." : "Salvar Credenciais Globais"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
