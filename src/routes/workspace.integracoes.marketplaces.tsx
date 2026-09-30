import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Store, Truck, Utensils, RefreshCw, CheckCircle2, AlertCircle, Link2, Unlink, Sliders, ExternalLink, ChevronRight, TrendingUp, Package, Copy, Plus, Search, Check, Radio, FileCode2, History, Barcode } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listMarketplaceConnectors, saveMarketplaceConnector, disconnectMarketplaceConnector, triggerSyncConnector, getMarketplaceFinancialSummary, syncProductStockToMarketplaces, mapProductToMarketplace, deleteProductChannelListing, listProductMarketplaceMappings, importProductFromMercadoLivre, calculateAndApplyChannelPricing, listMarketplaceSyncLogs, type MarketplaceConnectorDTO, type MarketplacePlatform, type ProductMarketplaceMappingDTO, type MarketplaceSyncLogDTO } from "@/services/marketplace-hub.functions";
import { listStoreWebhookEvents, reprocessWebhookEvent } from "@/services/marketplace-webhooks.functions";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/integracoes/marketplaces")({
  head: () => ({
    meta: [{ title: "Marketplaces | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const [connectors, financialSummary, mappings, syncLogs, webhookEvents] = await Promise.all([
        listMarketplaceConnectors().catch(() => []),
        getMarketplaceFinancialSummary().catch(() => []),
        listProductMarketplaceMappings().catch(() => []),
        listMarketplaceSyncLogs({ data: { limit: 20 } }).catch(() => []),
        listStoreWebhookEvents({ data: { status: "all", limit: 20 } }).catch(() => []),
      ]);
      return {
        initialConnectors: connectors,
        initialSummary: financialSummary,
        initialMappings: mappings,
        initialSyncLogs: syncLogs,
        initialWebhookEvents: webhookEvents,
      };
    } catch (err) {
      console.error("[loader:workspace.integracoes.marketplaces] error:", err);
      return {
        initialConnectors: [],
        initialSummary: [],
        initialMappings: [],
        initialSyncLogs: [],
        initialWebhookEvents: [],
      };
    }
  },
  component: MarketplaceHubPage,
});

interface PlatformMeta {
  platform: MarketplacePlatform;
  name: string;
  category: "ecommerce" | "food" | "logistics";
  icon: typeof ShoppingBag;
  color: string;
  docUrl: string;
  badgeLabel: string;
  // Campos específicos de credencial por plataforma (anti-GAP C1)
  credentialFields: Array<{
    key: string;
    label: string;
    placeholder: string;
    type?: "text" | "password";
    required?: boolean;
    hint?: string;
  }>;
}

const PLATFORMS_CATALOG: PlatformMeta[] = [
  {
    platform: "mercadolivre",
    name: "Mercado Livre",
    category: "ecommerce",
    icon: ShoppingBag,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://developers.mercadolivre.com.br/",
    badgeLabel: "MLB Sync",
    credentialFields: [
      { key: "client_id", label: "App ID (Client ID)", placeholder: "1234567890", required: true },
      { key: "client_secret", label: "Client Secret", placeholder: "xxxxxxxxxxxxxxxx", type: "password", required: true },
      { key: "access_token", label: "Access Token", placeholder: "APP_USR-1234...", type: "password" },
      { key: "seller_id", label: "Seller ID (MLB)", placeholder: "MLB123456789", hint: "Visível no painel do Mercado Livre" },
    ],
  },
  {
    platform: "ifood",
    name: "iFood",
    category: "food",
    icon: Utensils,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://developer.ifood.com.br/",
    badgeLabel: "OpenDelivery v1.0",
    credentialFields: [
      { key: "client_id", label: "Client ID (Portal do Parceiro)", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", required: true },
      { key: "client_secret", label: "Client Secret", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx", type: "password", required: true },
      { key: "merchant_uuid", label: "Merchant UUID da Loja", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", hint: "Encontrado em: Portal do Parceiro → Minha Conta" },
    ],
  },
  {
    platform: "shopee",
    name: "Shopee Brasil",
    category: "ecommerce",
    icon: Store,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://open.shopee.com.br/",
    badgeLabel: "Shopee Open API",
    credentialFields: [
      { key: "partner_id", label: "Partner ID", placeholder: "1234567", required: true },
      { key: "partner_key", label: "Partner Key", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", type: "password", required: true },
      { key: "shop_id", label: "Shop ID", placeholder: "123456789", hint: "Encontrado em: Shopee Seller Centre → Minha Loja" },
    ],
  },
  {
    platform: "amazon",
    name: "Amazon Brasil",
    category: "ecommerce",
    icon: Package,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://developer-docs.amazon.com/sp-api/",
    badgeLabel: "SP-API Brasil",
    credentialFields: [
      { key: "seller_id", label: "Seller ID / MerchantToken", placeholder: "AXXXXXXXXXXXXX", required: true },
      { key: "marketplace_id", label: "Marketplace ID (Brasil)", placeholder: "A2Q3Y263D00KWC" },
      { key: "lwa_client_id", label: "LWA Client ID (SP-API)", placeholder: "amzn1.application-oa2-client.xxx", required: true },
      { key: "lwa_client_secret", label: "LWA Client Secret", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", type: "password", required: true },
      { key: "refresh_token", label: "Refresh Token", placeholder: "Atzr|IwEB...", type: "password", hint: "Gerado no SP-API Self Authorization" },
    ],
  },
  {
    platform: "magalu",
    name: "Magazine Luiza",
    category: "ecommerce",
    icon: Store,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://developers.magazineluiza.com.br/",
    badgeLabel: "IntegraCommerce",
    credentialFields: [
      { key: "client_id", label: "Client ID (IntegraCommerce)", placeholder: "xxxxxxxxxxxxxxxx", required: true },
      { key: "client_secret", label: "Client Secret", placeholder: "xxxxxxxxxxxxxxxx", type: "password", required: true },
      { key: "seller_id", label: "Código do Vendedor Magalu", placeholder: "MAGXXXXX" },
    ],
  },
  {
    platform: "melhorenvio",
    name: "Melhor Envio",
    category: "logistics",
    icon: Truck,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://docs.melhorenvio.com.br/",
    badgeLabel: "Cotação de Frete",
    credentialFields: [
      { key: "api_token", label: "Token de Acesso (Bearer)", placeholder: "Cole o token gerado no portal", type: "password", required: true, hint: "Gere em: app.melhorenvio.com.br → Tokens → Criar token" },
    ],
  },
  {
    platform: "correios",
    name: "Correios (CWS)",
    category: "logistics",
    icon: Truck,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://cws.correios.com.br/",
    badgeLabel: "CWS Contrato",
    credentialFields: [
      { key: "username", label: "Usuário / CPF CNPJ", placeholder: "00.000.000/0000-00", required: true },
      { key: "access_code", label: "Código de Acesso (CWS)", placeholder: "Código fornecido pelos Correios", type: "password", required: true },
      { key: "contract_number", label: "Nº do Contrato", placeholder: "0000000000", hint: "No contrato de postagem com os Correios" },
      { key: "card_number", label: "Nº do Cartão de Postagem", placeholder: "0000000000" },
    ],
  },
  {
    platform: "loggi",
    name: "Loggi",
    category: "logistics",
    icon: Truck,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://docs.loggi.com/",
    badgeLabel: "Logística",
    credentialFields: [
      { key: "api_key", label: "API Key (Bearer)", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx", type: "password", required: true, hint: "Obtida em: app.loggi.com → Configurações → Integrações" },
      { key: "shop_id", label: "Shop ID Loggi", placeholder: "12345" },
    ],
  },
  {
    platform: "jadlog",
    name: "Jadlog",
    category: "logistics",
    icon: Truck,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://www.jadlog.com.br/jadlog/servicos",
    badgeLabel: "Cargas Expressas",
    credentialFields: [
      { key: "api_user", label: "Usuário API Jadlog", placeholder: "seu@email.com", required: true },
      { key: "api_password", label: "Senha API", placeholder: "xxxxxxxxxxxxxxxx", type: "password", required: true },
      { key: "cnpj", label: "CNPJ da Empresa", placeholder: "00.000.000/0000-00" },
      { key: "modalidade", label: "Modalidade Padrão", placeholder: "Ex: .COM, Economico", hint: "Modalidade default para cotações automáticas" },
    ],
  },
  {
    platform: "rappi",
    name: "Rappi",
    category: "food",
    icon: Utensils,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://developer.rappi.com/",
    badgeLabel: "REST / Webhooks",
    credentialFields: [
      { key: "api_key", label: "API Key do Parceiro", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx", type: "password", required: true },
      { key: "webhook_secret", label: "Webhook Secret (HMAC)", placeholder: "xxxxxxxxxxxxxxxx", type: "password" },
    ],
  },
  {
    platform: "amodelivery",
    name: "Amo Delivery",
    category: "food",
    icon: Utensils,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://amodelivery.com/",
    badgeLabel: "Delivery Local",
    credentialFields: [
      { key: "api_key", label: "API Key", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx", type: "password", required: true },
      { key: "restaurant_id", label: "ID do Restaurante", placeholder: "12345" },
    ],
  },
  {
    platform: "google_business",
    name: "Google Meu Negócio",
    category: "ecommerce",
    icon: Store,
    color: "bg-muted text-foreground border border-border/60",
    docUrl: "https://developers.google.com/my-business/",
    badgeLabel: "Business Profile API",
    credentialFields: [
      { key: "client_id", label: "OAuth2 Client ID", placeholder: "xxxxxxxxxx.apps.googleusercontent.com", required: true },
      { key: "client_secret", label: "OAuth2 Client Secret", placeholder: "GOCSPX-xxxxxxxxxxxxxxxxx", type: "password", required: true },
      { key: "location_id", label: "Location ID (Google Business)", placeholder: "locations/12345678", hint: "Encontrado no painel Google Business Profile" },
    ],
  },
];

function MarketplaceHubPage() {
  const {
    initialConnectors,
    initialSummary,
    initialMappings,
    initialSyncLogs,
    initialWebhookEvents,
  } = Route.useLoaderData();

  const queryClient = useQueryClient();

  // Navigation tabs
  const [mainView, setMainView] = useState<"connectors" | "mapping" | "audit">("connectors");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "ecommerce" | "food" | "logistics">("all");

  // Modal states
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformMeta | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);

  // Form states for Connector Config
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [accountNickname, setAccountNickname] = useState("");
  const [autoAccept, setAutoAccept] = useState(false);
  const [syncStock, setSyncStock] = useState(true);

  // Form states for Product Mapping
  const [selectedProductForMapping, setSelectedProductForMapping] = useState<ProductMarketplaceMappingDTO | null>(null);
  const [mappingPlatform, setMappingPlatform] = useState<MarketplacePlatform>("mercadolivre");
  const [externalListingId, setExternalListingId] = useState("");
  const [externalSku, setExternalSku] = useState("");
  const [priceMarginPercent, setPriceMarginPercent] = useState(0);

  // Queries
  const { data: connectors = initialConnectors } = useQuery({
    queryKey: ["marketplace-connectors"],
    queryFn: () => listMarketplaceConnectors(),
    initialData: initialConnectors,
  });

  const { data: summary = initialSummary } = useQuery({
    queryKey: ["marketplace-financial-summary"],
    queryFn: () => getMarketplaceFinancialSummary(),
    initialData: initialSummary,
  });

  const { data: mappings = initialMappings } = useQuery({
    queryKey: ["marketplace-product-mappings"],
    queryFn: () => listProductMarketplaceMappings(),
    initialData: initialMappings,
  });

  const { data: syncLogs = initialSyncLogs } = useQuery({
    queryKey: ["marketplace-sync-logs"],
    queryFn: () => listMarketplaceSyncLogs({ data: { limit: 30 } }),
    initialData: initialSyncLogs,
  });

  const { data: webhookEvents = initialWebhookEvents } = useQuery({
    queryKey: ["marketplace-webhook-events"],
    queryFn: () => listStoreWebhookEvents({ data: { status: "all", limit: 30 } }),
    initialData: initialWebhookEvents,
  });

  // Mutations
  const saveConnectorMutation = useMutation({
    mutationFn: (payload: any) => saveMarketplaceConnector({ data: payload }),
    onSuccess: () => {
      toast.success("Canal conectado com sucesso!");
      setConfigModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["marketplace-connectors"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar conexão.");
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (platform: MarketplacePlatform) =>
      disconnectMarketplaceConnector({ data: { platform } }),
    onSuccess: () => {
      toast.success("Canal desconectado.");
      queryClient.invalidateQueries({ queryKey: ["marketplace-connectors"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao desconectar.");
    },
  });

  const syncMutation = useMutation({
    mutationFn: (platform: MarketplacePlatform) =>
      triggerSyncConnector({ data: { platform, syncType: "full" } }),
    onSuccess: (res) => {
      toast.success(res.message || "Sincronização executada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["marketplace-connectors"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-sync-logs"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao sincronizar.");
    },
  });

  const syncStockMutation = useMutation({
    mutationFn: ({ productId, newStockQty }: { productId: string; newStockQty: number }) =>
      syncProductStockToMarketplaces({ data: { productId, newStockQty } }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["marketplace-sync-logs"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao sincronizar estoque.");
    },
  });

  const mapProductMutation = useMutation({
    mutationFn: (payload: any) => mapProductToMarketplace({ data: payload }),
    onSuccess: (res) => {
      toast.success(res.message);
      setMappingModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["marketplace-product-mappings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao vincular anúncio.");
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: (payload: { productId: string; platform: MarketplacePlatform }) =>
      deleteProductChannelListing({ data: payload }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["marketplace-product-mappings"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao desvincular anúncio.");
    },
  });

  const reprocessEventMutation = useMutation({
    mutationFn: (eventId: string) => reprocessWebhookEvent({ data: { eventId } }),
    onSuccess: () => {
      toast.success("Evento de webhook reprocessado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["marketplace-webhook-events"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao reprocessar evento.");
    },
  });

  // Handlers
  const handleOpenConfig = (p: PlatformMeta) => {
    setSelectedPlatform(p);
    const existing = connectors.find((c: MarketplaceConnectorDTO) => c.platform === p.platform);
    if (existing) {
      setAccountNickname(existing.account_nickname || "");
      setAutoAccept(existing.settings?.auto_accept_orders ?? false);
      setSyncStock(existing.settings?.sync_stock ?? true);
      // Preenche campos com credenciais salvas (sem expor tokens — valores são mascarados no type="password")
      const savedCreds = ((existing.settings as any)?.credentials || {}) as Record<string, string>;
      const initialVals: Record<string, string> = {};
      p.credentialFields.forEach((f) => {
        initialVals[f.key] = savedCreds[f.key] ? "••••••••" : "";
      });
      setFormValues(initialVals);
    } else {
      setAccountNickname("");
      setAutoAccept(false);
      setSyncStock(true);
      setFormValues({});
    }
    setConfigModalOpen(true);
  };

  const handleSaveConfig = () => {
    if (!selectedPlatform) return;
    // Filtra apenas campos preenchidos e não-mascarados (ignora placeholder de senha existente)
    const cleanPayload = Object.fromEntries(
      Object.entries(formValues).filter(([, v]) => v.trim() !== "" && v !== "••••••••")
    );
    // Deriva external_account_id do payload de credencial
    const extId =
      cleanPayload.seller_id ||
      cleanPayload.shop_id ||
      cleanPayload.merchant_uuid ||
      cleanPayload.restaurant_id ||
      cleanPayload.location_id ||
      accountNickname ||
      undefined;
    saveConnectorMutation.mutate({
      platform: selectedPlatform.platform,
      name: selectedPlatform.name,
      external_account_id: extId?.trim() || undefined,
      account_nickname: accountNickname.trim() || undefined,
      credential_payload: cleanPayload,
      status: "connected",
      settings: {
        auto_accept_orders: autoAccept,
        sync_stock: syncStock,
        sync_products: true,
        sync_orders: true,
      },
    });
  };

  const handleOpenWebhookInfo = (p: PlatformMeta) => {
    setSelectedPlatform(p);
    setWebhookModalOpen(true);
  };

  const handleOpenMapping = (p: ProductMarketplaceMappingDTO) => {
    setSelectedProductForMapping(p);
    setExternalListingId("");
    setExternalSku(p.sku || "");
    setPriceMarginPercent(0);
    setMappingModalOpen(true);
  };

  const handleSaveMapping = () => {
    if (!selectedProductForMapping) return;
    mapProductMutation.mutate({
      productId: selectedProductForMapping.id,
      platform: mappingPlatform,
      externalListingId,
      externalSku: externalSku || undefined,
      priceMarginPercent: Number(priceMarginPercent) || 0,
    });
  };

  // Aggregates
  const totalGrossSalesCents = summary.reduce((acc, curr) => acc + (curr.gross_sales_cents || 0), 0);
  const totalFeesCents = summary.reduce((acc, curr) => acc + (curr.marketplace_fees_cents || 0), 0);
  const totalNetCents = summary.reduce((acc, curr) => acc + (curr.net_payout_cents || 0), 0);
  const totalConnected = connectors.filter((c: MarketplaceConnectorDTO) => c.status === "connected").length;

  const filteredCatalog = PLATFORMS_CATALOG.filter((p) => {
    if (categoryFilter === "all") return true;
    return p.category === categoryFilter;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header Canônico */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Ecossistema Omnicanal"
          title="Hub de Marketplaces"
          description="Gestão unificada: conectores oficiais, mapeamento de SKUs, estoque ativo e conciliação de webhooks."
        />
        <div className="flex items-center gap-2">
          
          <Button asChild variant="outline" className="h-10 rounded-xl text-xs font-medium">
            <Link to="/workspace/fiscal/nfe">
              Módulo Fiscal (NF-e)
            </Link>
          </Button>
          <Button asChild className="h-10 rounded-xl text-xs font-semibold bg-foreground text-background">
            <Link to="/workspace/pedidos/expedicao">
              Expedição WMS
            </Link>
          </Button>
        </div>
      </div>

      {/* V143 Truth Engine: Silent Empty State quando nenhum marketplace está conectado */}
      {totalConnected === 0 && (
        <div className="rounded-2xl border border-border/70 bg-card p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground grayscale shrink-0">
              <Utensils className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">iFood e Marketplaces não conectados</h3>
              <p className="text-xs text-muted-foreground">
                Zero vendas externas registradas ({formatMoney(0)}). Conecte sua chave de API oficial para sincronizar pedidos reais.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleOpenConfig(PLATFORMS_CATALOG[1])}
            className="h-11 rounded-xl text-xs font-bold px-5 shrink-0"
          >
            Ativar Integração
          </Button>
        </div>
      )}

      {/* Métricas Financeiras e Operacionais Reais */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Canais Ativos</p>
          <p className="text-2xl font-bold tracking-tight mt-1 text-foreground">
            {totalConnected} <span className="text-xs text-muted-foreground font-normal">/ {PLATFORMS_CATALOG.length}</span>
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Conexões oficiais ativas</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Vendas em Marketplaces</p>
          <p className="text-2xl font-bold tracking-tight mt-1 text-foreground">
            {formatMoney(totalGrossSalesCents)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Faturamento bruto nos canais</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Taxas de Intermediação</p>
          <p className="text-2xl font-bold tracking-tight mt-1 text-rose-600">
            {formatMoney(totalFeesCents)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Comissões retidas nas plataformas</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <p className="text-xs text-muted-foreground font-medium">Repasse Líquido D+0</p>
          <p className="text-2xl font-bold tracking-tight mt-1 text-emerald-600">
            {formatMoney(totalNetCents)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Conciliado no fluxo de caixa</p>
        </div>
      </div>

      {/* Barra de Abas Principal (Apple Segmented Control) */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setMainView("connectors")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
            mainView === "connectors"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground bg-muted/40"
          )}
        >
          <Radio className="size-3.5" /> Canais ({PLATFORMS_CATALOG.length})
        </button>
        <button
          type="button"
          onClick={() => setMainView("mapping")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
            mainView === "mapping"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground bg-muted/40"
          )}
        >
          <Barcode className="size-3.5" /> Mapeamento de SKUs ({mappings.length})
        </button>
        <button
          type="button"
          onClick={() => setMainView("audit")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer",
            mainView === "audit"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground bg-muted/40"
          )}
        >
          <History className="size-3.5" /> Auditoria de Webhooks ({webhookEvents.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: CANAIS */}
      {/* ========================================================================= */}
      {mainView === "connectors" && (
        <div className="space-y-4">
          {/* Filtros de Categoria */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={categoryFilter === "all" ? "default" : "outline"}
              className="h-8 rounded-lg text-xs"
              onClick={() => setCategoryFilter("all")}
            >
              Todos ({PLATFORMS_CATALOG.length})
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === "ecommerce" ? "default" : "outline"}
              className="h-8 rounded-lg text-xs"
              onClick={() => setCategoryFilter("ecommerce")}
            >
              Marketplaces E-Commerce
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === "food" ? "default" : "outline"}
              className="h-8 rounded-lg text-xs"
              onClick={() => setCategoryFilter("food")}
            >
              Delivery e Restaurantes
            </Button>
            <Button
              size="sm"
              variant={categoryFilter === "logistics" ? "default" : "outline"}
              className="h-8 rounded-lg text-xs"
              onClick={() => setCategoryFilter("logistics")}
            >
              Frete e Logística
            </Button>
          </div>

          {/* Grid de Canais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map((item) => {
              const conn = connectors.find((c: MarketplaceConnectorDTO) => c.platform === item.platform);
              const isConnected = conn?.status === "connected";
              const Icon = item.icon;

              return (
                <div
                  key={item.platform}
                  className={cn(
                    "rounded-2xl border p-5 flex flex-col justify-between transition-all bg-card shadow-xs min-h-[195px]",
                    isConnected ? "border-emerald-500/40 bg-emerald-500/[0.02]" : "border-border/70"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-muted text-foreground border border-border/60 flex items-center justify-center shadow-2xs">
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground tracking-tight">{item.name}</h3>
                          <p className="text-xs text-muted-foreground">{item.badgeLabel}</p>
                        </div>
                      </div>
                      {isConnected ? (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-xs font-medium h-5">
                          Conectado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground text-xs h-5">
                          Desconectado
                        </Badge>
                      )}
                    </div>

                    {isConnected && conn?.account_nickname ? (
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        Conta: <span className="font-medium text-foreground">{conn.account_nickname}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/70 mb-1 truncate">
                        {(item as any).description || "Canal disponível para conexão"}
                      </p>
                    )}

                    {isConnected && conn?.last_sync_at ? (
                      <p className="text-xs text-muted-foreground mb-2">
                        Última sincronização: {formatDateTime(conn.last_sync_at)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 mb-2">
                        Pronto para vincular catálogo e pedidos
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenWebhookInfo(item)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors cursor-pointer"
                        title="Ver URL do Webhook"
                      >
                        <FileCode2 className="size-3" /> Webhook
                      </button>
                      <a
                        href={item.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        Docs <ExternalLink className="size-3" />
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isConnected ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                            onClick={() => disconnectMutation.mutate(item.platform)}
                            disabled={disconnectMutation.isPending}
                            title="Desconectar"
                          >
                            <Unlink className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs font-medium cursor-pointer"
                            onClick={() => syncMutation.mutate(item.platform)}
                            disabled={syncMutation.isPending}
                          >
                            <RefreshCw className={cn("size-3 mr-1", syncMutation.isPending && "animate-spin")} />
                            Sincronizar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs font-medium cursor-pointer"
                            onClick={() => handleOpenConfig(item)}
                          >
                            Ajustes
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                          onClick={() => handleOpenConfig(item)}
                        >
                          Conectar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: MAPEAMENTO DE SKUS */}
      {/* ========================================================================= */}
      {mainView === "mapping" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-foreground">Catálogo Integrado e Vínculo de SKUs</h3>
                <p className="text-xs text-muted-foreground">
                  Ligue os produtos cadastrados na Waesy aos anúncios do Mercado Livre, Shopee, iFood e Amazon para baixa de estoque bidirecional.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedProductForMapping(null);
                    setMappingPlatform("mercadolivre");
                    setMappingModalOpen(true);
                  }}
                  className="rounded-xl text-xs font-bold gap-1.5 h-9 px-4 bg-primary hover:opacity-90 text-primary-foreground cursor-pointer shadow-xs"
                >
                  <ShoppingBag className="size-3.5" />
                  <span>Vincular ao Mercado Livre</span>
                </Button>
              </div>
            </div>

            <div className="border border-border/70 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>Produto Local</TableHead>
                    <TableHead>SKU Interno</TableHead>
                    <TableHead>Preço Base</TableHead>
                    <TableHead>Estoque Atual</TableHead>
                    <TableHead>Canais Mapeados</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                        Nenhum produto cadastrado no catálogo local para mapeamento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mappings.map((item) => {
                      const channelKeys = Object.keys(item.mappings || {});

                      return (
                        <TableRow key={item.id} className="text-xs">
                          <TableCell className="font-medium text-foreground">
                            {item.title}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {item.sku || "—"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatMoney(item.price_cents)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-mono",
                                item.stock_on_hand > 5
                                  ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                  : item.stock_on_hand > 0
                                  ? "border-border text-foreground bg-muted/50"
                                  : "border-rose-500/40 text-rose-600 bg-rose-500/10"
                              )}
                            >
                              {item.stock_on_hand} un
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {channelKeys.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">Sem vínculos externos</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {channelKeys.map((ch) => (
                                  <Badge key={ch} variant="outline" className="text-xs font-mono capitalize flex items-center gap-1 group/badge">
                                    <span>{ch}: #{item.mappings[ch]?.listing_id || "OK"}</span>
                                    <button
                                      type="button"
                                      onClick={() => deleteMappingMutation.mutate({ productId: item.id, platform: ch as MarketplacePlatform })}
                                      disabled={deleteMappingMutation.isPending}
                                      className="opacity-40 hover:opacity-100 hover:text-destructive cursor-pointer ml-0.5 text-xs leading-none"
                                      title={`Desvincular canal ${ch}`}
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs font-medium cursor-pointer"
                              onClick={() => syncStockMutation.mutate({ productId: item.id, newStockQty: item.stock_on_hand })}
                              disabled={syncStockMutation.isPending}
                              title="Sincronizar estoque nos canais"
                            >
                              <RefreshCw className={cn("size-3 mr-1", syncStockMutation.isPending && "animate-spin")} />
                              Sync Estoque
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-2.5 text-xs font-semibold bg-foreground text-background cursor-pointer"
                              onClick={() => handleOpenMapping(item)}
                            >
                              <Plus className="size-3 mr-1" /> Vincular Canal
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: AUDITORIA DE WEBHOOKS */}
      {/* ========================================================================= */}
      {mainView === "audit" && (
        <div className="space-y-6">
          {/* Tabela de Eventos de Webhooks Recebidos */}
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <FileCode2 className="size-4 text-primary" /> Inbox Transacional de Webhooks
                </h3>
                <p className="text-xs text-muted-foreground">
                  Auditoria em tempo real de notificações de pedidos e eventos recebidos de Mercado Livre, iFood, Shopee e APIs fiscais.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs cursor-pointer"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["marketplace-webhook-events"] })}
              >
                <RefreshCw className="size-3 mr-1" /> Atualizar Feed
              </Button>
            </div>

            <div className="border border-border/70 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>Data</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>ID do Evento</TableHead>
                    <TableHead>Tópico</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                        Nenhum evento de webhook recebido até o momento. Utilize o botão &quot;Testar Pedido Simulado&quot; para validar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    webhookEvents.map((evt: any) => (
                      <TableRow key={evt.id} className="text-xs">
                        <TableCell className="font-mono text-muted-foreground">
                          {formatDateTime(evt.created_at)}
                        </TableCell>
                        <TableCell className="capitalize font-semibold text-foreground">
                          {evt.platform}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground truncate max-w-[140px]">
                          {evt.event_id || evt.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {evt.topic || evt.resource_id || "order_notification"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-medium",
                              evt.status === "processed"
                                ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                : evt.status === "failed"
                                ? "border-rose-500/40 text-rose-600 bg-rose-500/10"
                                : "border-border text-foreground bg-muted/50"
                            )}
                          >
                            {evt.status === "processed" ? "Processado" : evt.status === "failed" ? "Falha" : "Recebido"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            onClick={() => reprocessEventMutation.mutate(evt.id)}
                            disabled={reprocessEventMutation.isPending}
                          >
                            <RefreshCw className={cn("size-3 mr-1", reprocessEventMutation.isPending && "animate-spin")} />
                            Reprocessar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Tabela de Logs de Sincronização */}
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <History className="size-4 text-primary" /> Histórico de Despacho e Sincronização
            </h3>

            <div className="border border-border/70 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>Data</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Tipo de Sync</TableHead>
                    <TableHead>Direção</TableHead>
                    <TableHead>Itens Atualizados</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                        Nenhum log de sincronização registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    syncLogs.map((log: MarketplaceSyncLogDTO) => (
                      <TableRow key={log.id} className="text-xs">
                        <TableCell className="font-mono text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </TableCell>
                        <TableCell className="capitalize font-semibold text-foreground">
                          {log.platform}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {log.sync_type}
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">
                          {log.direction}
                        </TableCell>
                        <TableCell className="font-mono">
                          {log.items_updated} un
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {log.duration_ms ? `${log.duration_ms}ms` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10 text-xs"
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAIS OPERACIONAIS (APPLE HIG) */}
      {/* ========================================================================= */}

      {/* Modal 1: Configurar Conexão de Canal */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Configurar {selectedPlatform?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Insira as credenciais oficiais fornecidas no portal do desenvolvedor da plataforma.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Apelido da conta */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Apelido da Conta / Loja</Label>
              <Input
                id="connector-nickname"
                placeholder="Ex: Loja Oficial SP"
                value={accountNickname}
                onChange={(e) => setAccountNickname(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            {/* Campos dinâmicos específicos da plataforma (Anti-GAP C1) */}
            {selectedPlatform?.credentialFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`cred-${field.key}`} className="text-xs font-medium">
                  {field.label}
                  {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                </Label>
                <Input
                  id={`cred-${field.key}`}
                  type={field.type === "password" ? "password" : "text"}
                  placeholder={field.placeholder}
                  value={formValues[field.key] || ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="h-10 text-xs rounded-xl font-mono"
                  autoComplete={field.type === "password" ? "new-password" : undefined}
                />
                {field.hint && (
                  <p className="text-xs text-muted-foreground">
                    {field.hint}
                  </p>
                )}
              </div>
            ))}

            <div className="pt-2 border-t border-border/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Sincronizar Estoque em Tempo Real</p>
                  <p className="text-xs text-muted-foreground">Baixa automática em vendas locais e remotas</p>
                </div>
                <Switch checked={syncStock} onCheckedChange={setSyncStock} />
              </div>

              {selectedPlatform?.category === "food" && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Aceite Automático de Pedidos</p>
                    <p className="text-xs text-muted-foreground">Dispara comanda direta para impressão da cozinha</p>
                  </div>
                  <Switch checked={autoAccept} onCheckedChange={setAutoAccept} />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              variant="outline"
              className="h-10 rounded-xl text-xs cursor-pointer"
              onClick={() => setConfigModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="h-10 rounded-xl text-xs font-semibold bg-foreground text-background cursor-pointer"
              onClick={handleSaveConfig}
              disabled={saveConnectorMutation.isPending}
            >
              {saveConnectorMutation.isPending ? "Salvando..." : "Salvar Conexão"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: URL de Webhook do Canal */}
      <Dialog open={webhookModalOpen} onOpenChange={setWebhookModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Webhook URL — {selectedPlatform?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cole esta URL no painel de desenvolvedor do marketplace para receber notificações em tempo real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">URL Canônica de Recepção (POST)</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/api/webhooks/marketplaces?platform=${selectedPlatform?.platform || "mercadolivre"}`
                      : `/api/webhooks/marketplaces?platform=${selectedPlatform?.platform || "mercadolivre"}`
                  }
                  className="h-10 text-xs rounded-xl font-mono bg-muted/30"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-3 cursor-pointer"
                  onClick={() => {
                    const url = `${window.location.origin}/api/webhooks/marketplaces?platform=${selectedPlatform?.platform || "mercadolivre"}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Webhook URL copiada para a área de transferência!");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-semibold text-foreground">Garantias Técnicas Ativas:</p>
              <p>• Idempotência transacional com prevenção estrita de duplicidade.</p>
              <p>• Inserção automática na tabela mestra de pedidos e KDS.</p>
              <p>• Baixa de estoque física imediata para SKUs mapeados.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              className="h-10 rounded-xl text-xs font-semibold bg-foreground text-background cursor-pointer"
              onClick={() => setWebhookModalOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Vincular Canal ao Produto */}
      <Dialog open={mappingModalOpen} onOpenChange={setMappingModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Vincular Canal ao Produto
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedProductForMapping?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Plataforma Externa</Label>
              <select
                value={mappingPlatform}
                onChange={(e) => setMappingPlatform(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-xs"
              >
                <option value="mercadolivre">Mercado Livre</option>
                <option value="ifood">iFood</option>
                <option value="shopee">Shopee</option>
                <option value="amazon">Amazon Brasil</option>
                <option value="magalu">Magazine Luiza</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">ID do Anúncio Externo (Listing ID)</Label>
              <Input
                placeholder="Ex: MLB9988223311 ou 492021"
                value={externalListingId}
                onChange={(e) => setExternalListingId(e.target.value)}
                className="h-10 text-xs rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">SKU no Canal (Opcional)</Label>
              <Input
                placeholder="Ex: CAM-BRANCA-G"
                value={externalSku}
                onChange={(e) => setExternalSku(e.target.value)}
                className="h-10 text-xs rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Acréscimo de Margem no Canal (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={priceMarginPercent}
                onChange={(e) => setPriceMarginPercent(Number(e.target.value))}
                className="h-10 text-xs rounded-xl font-mono"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                <span>Compensa taxas e comissões da plataforma.</span>
                {selectedProductForMapping && (
                  <span className="font-semibold text-foreground">
                    Preço no canal: {formatMoney(Math.round((selectedProductForMapping.price_cents || 0) * (1 + (priceMarginPercent || 0) / 100)))}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              variant="outline"
              className="h-10 rounded-xl text-xs cursor-pointer"
              onClick={() => setMappingModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              className="h-10 rounded-xl text-xs font-semibold bg-foreground text-background cursor-pointer"
              onClick={handleSaveMapping}
              disabled={mapProductMutation.isPending || !externalListingId.trim()}
            >
              {mapProductMutation.isPending ? "Salvando..." : "Salvar Mapeamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MarketplaceHubPage;
