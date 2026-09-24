import { TokenEconomyBanner, DataJudMiningPanel, PlacesMiningPanel, SpecializedUrlMiningPanel } from "./advanced-mining-tabs";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Scale, MapPin, Utensils, Zap } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Database,
  RefreshCw,
  Play,
  Clock,
  Building2,
  Rss,
  TrendingUp,
  Search,
  Plus,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Globe,
  Sparkles,
  Package,
  ShieldAlert,
  RotateCcw,
  ShoppingBag,
  DollarSign,
  Percent,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  getMiningStatsFn,
  getCrawlQueueFn,
  getIndexedBusinessesFn,
  getScraperAuditLogsFn,
  getRssFeedsFn,
  getMarketIndicatorsFn,
  runScraperFn,
  addCrawlSeedFn,
  addRssFeedFn,
  generateGhostStoresFn,
  dispatchScheduledMiningJobFn,
  getMinedProductsFn,
  getGlobalPriceBenchmarkFn,
  getDomainCooldownsFn,
  resetDomainCooldownFn,
  updateMinedProductFn,
  deleteMinedProductFn,
  importMinedProductToStoreFn,
  batchImportMinedProductsFn,
} from "@/services/mining.functions";
import type {
  MiningStats,
  CrawlQueueItem,
  IndexedBusiness,
  ScraperAuditLogEntry,
  RssFeed,
  EconomicIndicator,
} from "@/types/mining";

export function MiningDashboard({ initialStats }: { initialStats?: MiningStats }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<MiningStats | undefined>(initialStats);
  const [isLoadingStats, setIsLoadingStats] = useState(!initialStats);
  const [isRunningScraper, setIsRunningScraper] = useState<string | null>(null);

  // Fila de crawling
  const [queueItems, setQueueItems] = useState<CrawlQueueItem[]>([]);
  const [queueStatusFilter, setQueueStatusFilter] = useState<string>("all");
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // Empresas mineradas
  const [businesses, setBusinesses] = useState<IndexedBusiness[]>([]);
  const [businessSearch, setBusinessSearch] = useState("");
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);

  // Indicadores de mercado
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([]);
  const [isLoadingIndicators, setIsLoadingIndicators] = useState(false);

  // Feeds RSS
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [isLoadingFeeds, setIsLoadingFeeds] = useState(false);

  // Auditoria
  const [auditLogs, setAuditLogs] = useState<ScraperAuditLogEntry[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Produtos minerados & Radar de Preços
  const [minedProducts, setMinedProducts] = useState<any[]>([]);
  const [minedProductsTotal, setMinedProductsTotal] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [benchmarkQuery, setBenchmarkQuery] = useState("");
  const [benchmarkResult, setBenchmarkResult] = useState<any | null>(null);
  const [isLoadingBenchmark, setIsLoadingBenchmark] = useState(false);

  // Estados para Edição & Importação de Produtos Minerados
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editProductTitle, setEditProductTitle] = useState("");
  const [editProductPrice, setEditProductPrice] = useState("");
  const [editProductDescription, setEditProductDescription] = useState("");
  const [editProductImage, setEditProductImage] = useState("");
  const [editProductStatus, setEditProductStatus] = useState<string>("pending_review");
  const [isSavingProductEdit, setIsSavingProductEdit] = useState(false);

  const [importingProduct, setImportingProduct] = useState<any | null>(null);
  const [importTargetStoreId, setImportTargetStoreId] = useState("");
  const [isImportingProduct, setIsImportingProduct] = useState(false);

  // Seleção e Operações em Lote de Produtos Minerados
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBatchImportModalOpen, setIsBatchImportModalOpen] = useState(false);
  const [batchImportTargetStoreId, setBatchImportTargetStoreId] = useState("");
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Cooldowns e Resiliência Anti-Ban
  const [domainCooldowns, setDomainCooldowns] = useState<any[]>([]);
  const [isLoadingCooldowns, setIsLoadingCooldowns] = useState(false);
  const [isResettingCooldown, setIsResettingCooldown] = useState<string | null>(null);

  // Ações Manuais
  const [customUrl, setCustomUrl] = useState("");
  const [customCnpj, setCustomCnpj] = useState("");

  // Modais de Cadastro
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);
  const [newSeedName, setNewSeedName] = useState("");
  const [newSeedUrl, setNewSeedUrl] = useState("");
  const [newSeedCategory, setNewSeedCategory] = useState("news");
  const [isSubmittingSeed, setIsSubmittingSeed] = useState(false);

  const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedSiteUrl, setNewFeedSiteUrl] = useState("");
  const [isSubmittingFeed, setIsSubmittingFeed] = useState(false);

  const [isGeneratingGhost, setIsGeneratingGhost] = useState(false);
  const [isDispatchingCron, setIsDispatchingCron] = useState<string | null>(null);

  const handleGenerateGhostStores = async () => {
    setIsGeneratingGhost(true);
    try {
      const res = await generateGhostStoresFn({ data: { minScore: 80, limit: 50 } });
      toast.success((res as any).message || "Sucesso!");
      loadBusinesses();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar Ghost Stores.");
    } finally {
      setIsGeneratingGhost(false);
    }
  };

  const handleDispatchCron = async (jobType: "market-data" | "rss-fetcher") => {
    setIsDispatchingCron(jobType);
    try {
      await dispatchScheduledMiningJobFn({ data: { jobType } });
      toast.success(`Rotina ${jobType} executada com sucesso.`);
      if (jobType === "market-data") loadIndicators();
      if (jobType === "rss-fetcher") loadFeeds();
      loadStats();
    } catch (err: any) {
      toast.error(err.message || `Erro ao despachar rotina ${jobType}.`);
    } finally {
      setIsDispatchingCron(null);
    }
  };

  // Carrega estatísticas gerais
  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await getMiningStatsFn();
      setStats(res);
    } catch {
      toast.error("Erro ao carregar métricas de mineração.");
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Carrega Fila
  const loadQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await getCrawlQueueFn({
        data: {
          status: queueStatusFilter as any,
          limit: 50,
          offset: 0,
        },
      });
      setQueueItems((res as any).items);
    } catch {
      toast.error("Erro ao carregar fila de crawling.");
    } finally {
      setIsLoadingQueue(false);
    }
  };

  // Carrega Empresas
  const loadBusinesses = async () => {
    setIsLoadingBusinesses(true);
    try {
      const res = await getIndexedBusinessesFn({
        data: {
          search: businessSearch.trim() || undefined,
          limit: 50,
          offset: 0,
        },
      });
      setBusinesses((res as any).items);
    } catch {
      toast.error("Erro ao carregar empresas.");
    } finally {
      setIsLoadingBusinesses(false);
    }
  };

  // Carrega Indicadores
  const loadIndicators = async () => {
    setIsLoadingIndicators(true);
    try {
      const res = await getMarketIndicatorsFn();
      setIndicators(res);
    } catch {
      toast.error("Erro ao carregar indicadores econômicos do Banco Central.");
    } finally {
      setIsLoadingIndicators(false);
    }
  };

  // Carrega Feeds
  const loadFeeds = async () => {
    setIsLoadingFeeds(true);
    try {
      const res = await getRssFeedsFn();
      setFeeds(res);
    } catch {
      toast.error("Erro ao carregar feeds RSS.");
    } finally {
      setIsLoadingFeeds(false);
    }
  };

  // Carrega Logs de Auditoria
  const loadAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const res = await getScraperAuditLogsFn({ data: { limit: 50 } });
      setAuditLogs(res as any);
    } catch {
      toast.error("Erro ao carregar logs de auditoria.");
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Carrega Produtos Minerados
  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await getMinedProductsFn({
        data: {
          search: productSearch.trim() || undefined,
          limit: 30,
          offset: 0,
        },
      });
      setMinedProducts(res.products || []);
      setMinedProductsTotal(res.total || 0);
    } catch {
      toast.error("Erro ao carregar catálogo de produtos minerados.");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleOpenEditProduct = (p: any) => {
    setEditingProduct(p);
    setEditProductTitle(p.title || "");
    setEditProductPrice(p.price_cents ? (p.price_cents / 100).toFixed(2) : "0.00");
    setEditProductDescription(p.description || "");
    setEditProductImage(p.image_url || "");
    setEditProductStatus(p.status || "pending_review");
  };

  const handleSaveProductEdit = async () => {
    if (!editingProduct) return;
    setIsSavingProductEdit(true);
    try {
      const priceCents = Math.round(parseFloat(editProductPrice.replace(",", ".")) * 100) || 0;
      await updateMinedProductFn({
        data: {
          id: editingProduct.id,
          title: editProductTitle.trim(),
          price_cents: priceCents,
          description: editProductDescription.trim() || undefined,
          image_url: editProductImage.trim() || undefined,
          status: editProductStatus as any,
        },
      });
      toast.success("Produto minerado atualizado com sucesso!");
      setEditingProduct(null);
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações no produto minerado.");
    } finally {
      setIsSavingProductEdit(false);
    }
  };

  const handleQuickStatusProduct = async (productId: string, newStatus: "approved" | "rejected" | "pending_review") => {
    try {
      await updateMinedProductFn({
        data: {
          id: productId,
          status: newStatus,
        },
      });
      toast.success(`Status alterado para ${newStatus}.`);
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao alterar status.");
    }
  };

  const handleDeleteMinedProduct = async (productId: string) => {
    try {
      await deleteMinedProductFn({ data: { id: productId } });
      toast.success("Produto minerado excluído.");
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao excluir.");
    }
  };

  const handleOpenImportProduct = (p: any) => {
    setImportingProduct(p);
    setImportTargetStoreId("");
  };

  // Operações em Lote
  const handleToggleSelectAllProducts = () => {
    if (selectedProductIds.length === minedProducts.length && minedProducts.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(minedProducts.map((p) => p.id));
    }
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchApproveProducts = async () => {
    if (selectedProductIds.length === 0) return;
    setIsProcessingBatch(true);
    try {
      for (const id of selectedProductIds) {
        await updateMinedProductFn({ data: { id, status: "approved" } });
      }
      toast.success(`${selectedProductIds.length} produtos aprovados com sucesso!`);
      setSelectedProductIds([]);
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao aprovar produtos em lote.");
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleBatchRejectProducts = async () => {
    if (selectedProductIds.length === 0) return;
    setIsProcessingBatch(true);
    try {
      for (const id of selectedProductIds) {
        await updateMinedProductFn({ data: { id, status: "rejected" } });
      }
      toast.success(`${selectedProductIds.length} produtos rejeitados.`);
      setSelectedProductIds([]);
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao rejeitar produtos em lote.");
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleBatchDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;
    setIsProcessingBatch(true);
    try {
      for (const id of selectedProductIds) {
        await deleteMinedProductFn({ data: { id } });
      }
      toast.success(`${selectedProductIds.length} produtos minerados excluídos.`);
      setSelectedProductIds([]);
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir produtos em lote.");
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleBatchImportToStore = async () => {
    if (selectedProductIds.length === 0 || !batchImportTargetStoreId.trim()) {
      toast.error("Informe a loja de destino para importar os produtos.");
      return;
    }
    setIsProcessingBatch(true);
    try {
      const res = await batchImportMinedProductsFn({
        data: {
          minedProductIds: selectedProductIds,
          storeId: batchImportTargetStoreId.trim(),
        },
      });
      toast.success(`${res.importedCount || 0} produtos importados com sucesso!`);
      setIsBatchImportModalOpen(false);
      setSelectedProductIds([]);
      setBatchImportTargetStoreId("");
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao importar produtos em lote.");
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importingProduct || !importTargetStoreId.trim()) {
      toast.error("Informe o UUID da loja de destino.");
      return;
    }
    setIsImportingProduct(true);
    try {
      const res = await importMinedProductToStoreFn({
        data: {
          minedProductId: importingProduct.id,
          storeId: importTargetStoreId.trim(),
        },
      });
      toast.success(res.message);
      setImportingProduct(null);
      setImportTargetStoreId("");
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao importar produto para o catálogo da loja.");
    } finally {
      setIsImportingProduct(false);
    }
  };

  // Calcula Benchmark de Preços Multiverticais
  const handleBenchmark = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : benchmarkQuery).trim();
    if (!q || q.length < 2) {
      toast.error("Digite pelo menos 2 caracteres para comparar preços.");
      return;
    }
    if (queryText !== undefined) {
      setBenchmarkQuery(queryText);
    }
    setIsLoadingBenchmark(true);
    try {
      const res = await getGlobalPriceBenchmarkFn({ data: { query: q } });
      setBenchmarkResult(res);
      if (res.matchesCount === 0) {
        toast.info(`Nenhum produto minerado com preço encontrado para "${q}".`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao calcular benchmark de preços.");
    } finally {
      setIsLoadingBenchmark(false);
    }
  };

  // Carrega Domínios em Cooldown (Anti-Ban)
  const loadCooldowns = async () => {
    setIsLoadingCooldowns(true);
    try {
      const res = await getDomainCooldownsFn();
      setDomainCooldowns(res.cooldowns || []);
    } catch {
      toast.error("Erro ao carregar telemetria de cooldowns.");
    } finally {
      setIsLoadingCooldowns(false);
    }
  };

  // Reset Manual de Cooldown de Domínio
  const handleResetCooldown = async (domain: string) => {
    setIsResettingCooldown(domain);
    try {
      const res = await resetDomainCooldownFn({ data: { domain } });
      toast.success(res.message);
      loadCooldowns();
    } catch (err: any) {
      toast.error(err.message || "Erro ao resetar cooldown do domínio.");
    } finally {
      setIsResettingCooldown(null);
    }
  };

  // Sincroniza abas sob demanda
  useEffect(() => {
    if (activeTab === "products") loadProducts();
    else if (activeTab === "cooldowns") loadCooldowns();
    else if (activeTab === "queue") loadQueue();
    else if (activeTab === "businesses") loadBusinesses();
    else if (activeTab === "market" && indicators.length === 0) loadIndicators();
    else if (activeTab === "feeds") loadFeeds();
    else if (activeTab === "audit") loadAuditLogs();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "queue") loadQueue();
  }, [queueStatusFilter]);

  // Executar Scraper
  const handleRunScraper = async (
    scraperType: "continuous-crawler" | "rss-fetcher" | "market-data" | "cnpj-enrichment",
    extraParams?: { targetUrl?: string; cnpj?: string }
  ) => {
    setIsRunningScraper(scraperType);
    try {
      const res = (await runScraperFn({
        data: {
          scraperType,
          targetUrl: extraParams?.targetUrl,
          cnpj: extraParams?.cnpj,
        },
      })) as any;

      if (res.success) {
        toast.success(res.message);
        loadStats();
        if (activeTab === "queue") loadQueue();
        if (activeTab === "businesses") loadBusinesses();
        if (activeTab === "market") loadIndicators();
        if (activeTab === "feeds") loadFeeds();
        if (activeTab === "audit") loadAuditLogs();
        if (extraParams?.targetUrl) setCustomUrl("");
        if (extraParams?.cnpj) setCustomCnpj("");
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(`Falha na execução: ${err.message || err}`);
    } finally {
      setIsRunningScraper(null);
    }
  };

  // Salvar Semente
  const handleAddSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeedUrl) return;

    setIsSubmittingSeed(true);
    try {
      const res = await addCrawlSeedFn({
        data: {
          name: newSeedName || newSeedUrl,
          url: newSeedUrl,
          category: newSeedCategory,
        },
      });
      toast.success(res.message);
      setIsSeedModalOpen(false);
      setNewSeedName("");
      setNewSeedUrl("");
      loadStats();
      if (activeTab === "queue") loadQueue();
    } catch (err: any) {
      toast.error(`Erro ao adicionar semente: ${err.message || err}`);
    } finally {
      setIsSubmittingSeed(false);
    }
  };

  // Salvar Feed RSS
  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl || !newFeedName) return;

    setIsSubmittingFeed(true);
    try {
      const res = await addRssFeedFn({
        data: {
          name: newFeedName,
          feedUrl: newFeedUrl,
          websiteUrl: newFeedSiteUrl || undefined,
        },
      });
      toast.success(res.message);
      setIsFeedModalOpen(false);
      setNewFeedName("");
      setNewFeedUrl("");
      setNewFeedSiteUrl("");
      loadStats();
      if (activeTab === "feeds") loadFeeds();
    } catch (err: any) {
      toast.error(`Erro ao cadastrar feed: ${err.message || err}`);
    } finally {
      setIsSubmittingFeed(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Header — Ultra Minimalista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Central de Dados & Inteligência Comercial
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão unificada de importações, catálogo comercial, processos judiciais e indicadores de mercado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin-master/mining">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3.5 rounded-xl border border-border/50 font-normal gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              Curadoria
              {stats?.minedArticles && stats?.minedArticles.pendingReview > 0 ? (
                <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-foreground font-mono">
                  {stats.minedArticles.pendingReview}
                </span>
              ) : null}
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadStats}
            disabled={isLoadingStats}
            className="h-10 px-3 rounded-xl font-normal"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoadingStats ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Button
            size="sm"
            onClick={() => handleRunScraper("continuous-crawler")}
            disabled={Boolean(isRunningScraper)}
            className="h-10 px-4 rounded-xl font-medium shadow-none"
          >
            {isRunningScraper === "continuous-crawler" ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-1.5 fill-current" />
            )}
            Sincronizar Dados
          </Button>
        </div>
      </div>

      {/* Banner de Economia de Tokens de IA */}
      <TokenEconomyBanner />

      {/* KPI Cards — Clean Paradigm */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Fila */}
        <div className="p-4 rounded-xl border border-border/40 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Fila</span>
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-semibold text-foreground">
            {stats?.crawlQueue.total ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {stats?.crawlQueue.pending ?? 0} pendentes
          </div>
        </div>

        {/* Card 2: Empresas */}
        <div className="p-4 rounded-xl border border-border/40 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Empresas</span>
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-semibold text-foreground">
            {stats?.indexedBusinesses.total ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {stats?.indexedBusinesses.withCnpj ?? 0} com CNPJ
          </div>
        </div>

        {/* Card 3: Produtos Minerados */}
        <div className="p-4 rounded-xl border border-border/40 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Produtos</span>
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-semibold text-foreground">
            {minedProductsTotal > 0 ? minedProductsTotal : (stats?.minedArticles?.total ?? 0)}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            Radar multiloja ativo
          </div>
        </div>

        {/* Card 4: Anti-Ban Cooldowns */}
        <div className="p-4 rounded-xl border border-border/40 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Anti-Ban</span>
            <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-semibold text-foreground">
            {domainCooldowns.length}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            Domínios em repouso
          </div>
        </div>

        {/* Card 5: Feeds RSS */}
        <div className="p-4 rounded-xl border border-border/40 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Feeds RSS</span>
            <Rss className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-semibold text-foreground">
            {stats?.rssFeeds.active ?? 0}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            de {stats?.rssFeeds.total ?? 0} portais
          </div>
        </div>

        {/* Card 6: Auditoria */}
        <div className="p-4 rounded-xl border border-border/40 bg-card space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-medium uppercase tracking-wider">Taxa Sucesso</span>
            <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-semibold text-foreground">
            {stats?.scraperAudit.successRatePercent ?? 100}%
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {stats?.scraperAudit.totalRuns ?? 0} execuções
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-muted/40 p-1 rounded-xl border border-border/40 overflow-x-auto justify-start h-auto">
          <TabsTrigger value="overview" className="rounded-lg text-xs font-normal py-2 px-3">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg text-xs font-normal py-2 px-3 gap-1.5">
            <Package className="w-3.5 h-3.5" />
            Produtos & Radar ({minedProductsTotal})
          </TabsTrigger>
          <TabsTrigger value="cooldowns" className="rounded-lg text-xs font-normal py-2 px-3 gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Segurança & Conexão ({domainCooldowns.length})
          </TabsTrigger>
          <TabsTrigger value="queue" className="rounded-lg text-xs font-normal py-2 px-3">
            Importações Agendadas ({stats?.crawlQueue.pending ?? 0})
          </TabsTrigger>
          <TabsTrigger value="businesses" className="rounded-lg text-xs font-normal py-2 px-3">
            Empresas ({stats?.indexedBusinesses.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="market" className="rounded-lg text-xs font-normal py-2 px-3">
            Indicadores BCB
          </TabsTrigger>
          <TabsTrigger value="feeds" className="rounded-lg text-xs font-normal py-2 px-3">
            Feeds de Notícias ({stats?.rssFeeds.total ?? 0})
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg text-xs font-normal py-2 px-3">
            Histórico de Importações
          </TabsTrigger>
          <TabsTrigger value="datajud" className="rounded-lg text-xs font-normal py-2 px-3 gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            Processos Judiciais (CNJ)
          </TabsTrigger>
          <TabsTrigger value="places" className="rounded-lg text-xs font-normal py-2 px-3 gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            Buscar Empresas Locais
          </TabsTrigger>
          <TabsTrigger value="specialized" className="rounded-lg text-xs font-normal py-2 px-3 gap-1.5">
            <Utensils className="w-3.5 h-3.5" />
            Importar por Link
          </TabsTrigger>

        </TabsList>

        
        {/* TAB DATAJUD */}
        <TabsContent value="datajud" className="space-y-4">
          <DataJudMiningPanel />
        </TabsContent>

        {/* TAB PLACES */}
        <TabsContent value="places" className="space-y-4">
          <PlacesMiningPanel />
        </TabsContent>

        {/* TAB SPECIALIZED (RECEITAS & EVENTOS) */}
        <TabsContent value="specialized" className="space-y-4">
          <SpecializedUrlMiningPanel />
        </TabsContent>

        {/* TAB 1: VISÃO GERAL */}
        <TabsContent value="overview" className="space-y-4">
          {/* Quick Engine Triggers */}
          <div className="p-4 rounded-xl border border-border/40 bg-card space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Disparo Direto</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <Button
                variant="outline"
                className="h-14 justify-start px-3.5 rounded-xl border border-border/50 hover:bg-muted/40 font-normal"
                onClick={() => handleRunScraper("continuous-crawler")}
                disabled={Boolean(isRunningScraper)}
              >
                <Globe className="w-4 h-4 mr-2.5 text-muted-foreground shrink-0" />
                <div className="text-left truncate">
                  <div className="font-medium text-xs text-foreground truncate">Continuous Crawler</div>
                  <div className="text-[11px] text-muted-foreground truncate">Processar próxima URL</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-14 justify-start px-3.5 rounded-xl border border-border/50 hover:bg-muted/40 font-normal"
                onClick={() => handleRunScraper("rss-fetcher")}
                disabled={Boolean(isRunningScraper)}
              >
                <Rss className="w-4 h-4 mr-2.5 text-muted-foreground shrink-0" />
                <div className="text-left truncate">
                  <div className="font-medium text-xs text-foreground truncate">RSS Ingester</div>
                  <div className="text-[11px] text-muted-foreground truncate">Sincronizar feeds ativos</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-14 justify-start px-3.5 rounded-xl border border-border/50 hover:bg-muted/40 font-normal"
                onClick={() => handleRunScraper("market-data")}
                disabled={Boolean(isRunningScraper)}
              >
                <TrendingUp className="w-4 h-4 mr-2.5 text-muted-foreground shrink-0" />
                <div className="text-left truncate">
                  <div className="font-medium text-xs text-foreground truncate">Indicadores BCB</div>
                  <div className="text-[11px] text-muted-foreground truncate">IPCA, SELIC, Câmbio</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-14 justify-start px-3.5 rounded-xl border border-border/50 hover:bg-muted/40 font-normal"
                onClick={() => setIsSeedModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2.5 text-muted-foreground shrink-0" />
                <div className="text-left truncate">
                  <div className="font-medium text-xs text-foreground truncate">Nova Semente</div>
                  <div className="text-[11px] text-muted-foreground truncate">Cadastrar domínio na fila</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Form de Ações Avulsas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Scraping de URL pontual */}
            <div className="p-4 rounded-xl border border-border/40 bg-card space-y-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Rastrear URL Avulsa
              </span>
              <div className="flex gap-2">
                <Input
                  placeholder="https://exemplo.com.br/artigo"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="rounded-xl border-border/50 text-xs h-10"
                />
                <Button
                  variant="outline"
                  onClick={() => handleRunScraper("continuous-crawler", { targetUrl: customUrl })}
                  disabled={!customUrl || Boolean(isRunningScraper)}
                  className="h-10 px-3.5 rounded-xl font-normal shrink-0"
                >
                  Rastrear
                </Button>
              </div>
            </div>

            {/* Enriquecimento de CNPJ pontual */}
            <div className="p-4 rounded-xl border border-border/40 bg-card space-y-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Consultar & Enriquecer CNPJ
              </span>
              <div className="flex gap-2">
                <Input
                  placeholder="00.000.000/0000-00"
                  value={customCnpj}
                  onChange={(e) => setCustomCnpj(e.target.value)}
                  className="rounded-xl border-border/50 text-xs h-10"
                />
                <Button
                  variant="outline"
                  onClick={() => handleRunScraper("cnpj-enrichment", { cnpj: customCnpj })}
                  disabled={!customCnpj || Boolean(isRunningScraper)}
                  className="h-10 px-3.5 rounded-xl font-normal shrink-0"
                >
                  Enriquecer
                </Button>
              </div>
            </div>

            {/* Floating Action Bar (Batch Operations Thumb Zone) */}
            {selectedProductIds.length > 0 && (
              <div className="sticky bottom-4 z-40 p-3 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 rounded-full border-primary/40 bg-primary/10 text-primary font-bold">
                    {selectedProductIds.length} selecionado{selectedProductIds.length > 1 ? "s" : ""}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProductIds([])}
                    className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    Desmarcar todos
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchApproveProducts}
                    disabled={isProcessingBatch}
                    className="h-8 rounded-xl text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Aprovar ({selectedProductIds.length})</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchRejectProducts}
                    disabled={isProcessingBatch}
                    className="h-8 rounded-xl text-xs gap-1 border-border/60 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <XCircle className="size-3.5" />
                    <span>Rejeitar</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => setIsBatchImportModalOpen(true)}
                    disabled={isProcessingBatch}
                    className="h-8 rounded-xl text-xs gap-1 font-semibold bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
                  >
                    <ShoppingBag className="size-3.5" />
                    <span>Importar para Loja...</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBatchDeleteProducts}
                    disabled={isProcessingBatch}
                    className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Excluir selecionados"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB: PRODUTOS MINERADOS & RADAR DE PREÇOS */}
        <TabsContent value="products" className="space-y-4">
          {/* Radar & Benchmark Box */}
          <div className="p-4 rounded-xl border border-border/40 bg-card space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Radar & Inteligência de Preços Multiverticais
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Compare cotações de um mesmo produto em múltiplos e-commerces e marketplaces minerados.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Ex: Smartphone, Cimento 50kg, Pneu 175/70..."
                  value={benchmarkQuery}
                  onChange={(e) => setBenchmarkQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBenchmark()}
                  className="pl-8 h-10 rounded-xl text-xs border-border/50"
                />
              </div>
              <Button
                onClick={() => handleBenchmark()}
                disabled={isLoadingBenchmark}
                className="h-10 px-4 rounded-xl text-xs font-medium cursor-pointer shrink-0"
              >
                {isLoadingBenchmark ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Search className="w-3.5 h-3.5 mr-1.5" />
                )}
                Comparar Preços
              </Button>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-muted-foreground">Exemplos:</span>
              {["Smartphone", "Cimento", "Pneu", "Café 500g"].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleBenchmark(chip)}
                  className="text-[11px] px-2 py-0.5 rounded-md border border-border/40 hover:bg-muted/30 text-muted-foreground transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Benchmark Results */}
            {benchmarkResult && benchmarkResult.matchesCount > 0 && (
              <div className="pt-3 border-t border-border/30 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl border border-border/30 bg-muted/10 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Menor Preço</span>
                    <div className="text-base font-semibold text-foreground">
                      {(benchmarkResult.minPriceCents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-border/30 bg-muted/10 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Preço Médio</span>
                    <div className="text-base font-semibold text-foreground">
                      {(benchmarkResult.averagePriceCents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-border/30 bg-muted/10 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Maior Preço</span>
                    <div className="text-base font-semibold text-foreground">
                      {(benchmarkResult.maxPriceCents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-border/30 bg-muted/10 space-y-1">
                    <span className="text-[11px] text-muted-foreground">Variação de Mercado</span>
                    <div className="text-base font-semibold text-foreground">
                      +{benchmarkResult.benchmarkSpreadPercent}%
                    </div>
                  </div>
                </div>

                {/* Benchmark Offers List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-medium text-foreground">
                    {benchmarkResult.matchesCount} ofertas mapeadas para "{benchmarkResult.query}":
                  </span>
                  <div className="divide-y divide-border/30 rounded-xl border border-border/30 bg-card overflow-hidden">
                    {benchmarkResult.offers.map((offer: any) => (
                      <div key={offer.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground truncate">{offer.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{offer.source_domain}</div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3">
                          <span className="font-semibold text-foreground">
                            {(offer.price_cents / 100).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                          {offer.source_url && (
                            <a
                              href={offer.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-foreground p-1"
                              title="Ver oferta original"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Catalog of Mined Products */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar catálogo minerado..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadProducts()}
                    className="pl-8 h-9 rounded-xl text-xs border-border/50"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={loadProducts}
                  className="h-9 px-3.5 rounded-xl text-xs font-normal cursor-pointer"
                >
                  Buscar
                </Button>
              </div>

              <span className="text-xs text-muted-foreground shrink-0 self-center">
                {minedProductsTotal} produtos indexados
              </span>
            </div>

            {/* Batch Operations Bar */}
            {selectedProductIds.length > 0 && (
              <div className="flex items-center justify-between p-2.5 px-3.5 bg-muted/30 border border-border/50 rounded-xl text-xs">
                <span className="font-medium text-foreground">
                  {selectedProductIds.length} {selectedProductIds.length === 1 ? "produto selecionado" : "produtos selecionados"}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessingBatch}
                    onClick={handleBatchApproveProducts}
                    className="h-7 px-2.5 rounded-lg text-xs font-normal"
                  >
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessingBatch}
                    onClick={handleBatchRejectProducts}
                    className="h-7 px-2.5 rounded-lg text-xs font-normal"
                  >
                    Rejeitar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isProcessingBatch}
                    onClick={handleBatchDeleteProducts}
                    className="h-7 px-2.5 rounded-lg text-xs font-normal text-destructive hover:bg-destructive/10"
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            )}

            {/* Mobile: WhatsApp Minimalist List */}
            <div className="block sm:hidden divide-y divide-border/40 rounded-xl border border-border/40 bg-card overflow-hidden">
              {isLoadingProducts ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" /> Carregando produtos...
                </div>
              ) : minedProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum produto minerado no momento. Execute o Continuous Crawler em lojas virtuais.
                </div>
              ) : (
                minedProducts.map((p) => {
                  const isChecked = selectedProductIds.includes(p.id);
                  return (
                  <div key={p.id} className="p-3 flex items-center justify-between gap-2.5 hover:bg-muted/20 transition-colors">
                    <div className="shrink-0 flex items-center">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleSelectProduct(p.id)}
                        className="size-4"
                      />
                    </div>
                    <div className="w-10 h-10 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-center shrink-0 overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground truncate">{p.title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{p.source_domain}</div>
                      <div className="text-xs font-semibold text-foreground mt-0.5">
                        {p.price_cents > 0
                          ? (p.price_cents / 100).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "Sob consulta"}
                        <span className="ml-2 text-[10px] text-muted-foreground font-mono capitalize">({p.status})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenImportProduct(p)}
                        className="h-8 px-2 rounded-lg text-xs gap-1 font-medium cursor-pointer"
                        title="Importar para Loja"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>Importar</span>
                      </Button>
                      <CrudActionsMenu
                        entityName="Produto Minerado"
                        onEdit={() => handleOpenEditProduct(p)}
                        onDelete={() => handleDeleteMinedProduct(p.id)}
                        deleteConfirmTitle="Excluir produto minerado?"
                        deleteConfirmDescription="Esta ação removerá o produto do catálogo de inteligência."
                        customActions={[
                          ...(p.status !== "approved"
                            ? [
                                {
                                  id: "approve",
                                  label: "Aprovar Produto",
                                  icon: CheckCircle2,
                                  onClick: () => handleQuickStatusProduct(p.id, "approved"),
                                },
                              ]
                            : []),
                          ...(p.status !== "rejected"
                            ? [
                                {
                                  id: "reject",
                                  label: "Rejeitar Produto",
                                  icon: XCircle,
                                  onClick: () => handleQuickStatusProduct(p.id, "rejected"),
                                  variant: "destructive" as const,
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </div>
                );})
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block rounded-xl border border-border/40 bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 border-b border-border/40">
                    <TableHead className="w-[40px] text-xs font-normal text-muted-foreground">
                      <Checkbox
                        checked={minedProducts.length > 0 && selectedProductIds.length === minedProducts.length}
                        onCheckedChange={handleToggleSelectAllProducts}
                        className="size-4"
                      />
                    </TableHead>
                    <TableHead className="w-[50px] text-xs font-normal text-muted-foreground"></TableHead>
                    <TableHead className="text-xs font-normal text-muted-foreground">Produto</TableHead>
                    <TableHead className="w-[130px] text-xs font-normal text-muted-foreground">Origem</TableHead>
                    <TableHead className="w-[110px] text-xs font-normal text-muted-foreground">Preço</TableHead>
                    <TableHead className="w-[100px] text-xs font-normal text-muted-foreground">Status</TableHead>
                    <TableHead className="w-[200px] text-right text-xs font-normal text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingProducts ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" />
                        Carregando catálogo de produtos...
                      </TableCell>
                    </TableRow>
                  ) : minedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                        Nenhum produto cadastrado no radar. Execute o crawler com seeds de e-commerce.
                      </TableCell>
                    </TableRow>
                  ) : (
                    minedProducts.map((p) => {
                      const isChecked = selectedProductIds.includes(p.id);
                      return (
                      <TableRow key={p.id} className="border-b border-border/30 hover:bg-muted/10">
                        <TableCell className="w-[40px] p-2 pl-3">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleSelectProduct(p.id)}
                            className="size-4"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="w-9 h-9 rounded-lg border border-border/30 bg-muted/20 flex items-center justify-center overflow-hidden">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-xs text-foreground truncate max-w-[260px]">
                          {p.title}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[130px]">
                          {p.source_domain}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground">
                          {p.price_cents > 0
                            ? (p.price_cents / 100).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] text-muted-foreground font-mono capitalize">
                            {p.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.source_url && (
                              <a
                                href={p.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted"
                                title="Abrir link original"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenImportProduct(p)}
                              className="h-7 px-2 rounded-lg text-xs font-medium gap-1 cursor-pointer"
                              title="Importar para Loja"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              Importar
                            </Button>
                            <CrudActionsMenu
                              entityName="Produto Minerado"
                              onEdit={() => handleOpenEditProduct(p)}
                              onDelete={() => handleDeleteMinedProduct(p.id)}
                              deleteConfirmTitle="Excluir produto minerado?"
                              deleteConfirmDescription="Esta ação removerá o produto do catálogo de inteligência."
                              customActions={[
                                ...(p.status !== "approved"
                                  ? [
                                      {
                                        id: "approve",
                                        label: "Aprovar Produto",
                                        icon: CheckCircle2,
                                        onClick: () => handleQuickStatusProduct(p.id, "approved"),
                                      },
                                    ]
                                  : []),
                                ...(p.status !== "rejected"
                                  ? [
                                      {
                                        id: "reject",
                                        label: "Rejeitar Produto",
                                        icon: XCircle,
                                        onClick: () => handleQuickStatusProduct(p.id, "rejected"),
                                        variant: "destructive" as const,
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );})
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* TAB: ANTI-BAN & COOLDOWNS */}
        <TabsContent value="cooldowns" className="space-y-4">
          <div className="p-4 rounded-xl border border-border/40 bg-card space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              Proteção de Rede & Resiliência Anti-Ban
            </h3>
            <p className="text-xs text-muted-foreground">
              Mecanismo de repouso automático para domínios que ativaram defesas Cloudflare/Akamai ou HTTP 429/403.
              O crawler suspende requisições ao domínio temporariamente para não desperdiçar créditos de proxies e evitar bloqueio definitivo de IP.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {domainCooldowns.length} domínios em quarentena de repouso
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCooldowns}
              className="h-8 px-2.5 rounded-lg text-xs font-normal gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingCooldowns ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>

          {/* Mobile WhatsApp list */}
          <div className="block sm:hidden divide-y divide-border/40 rounded-xl border border-border/40 bg-card overflow-hidden">
            {isLoadingCooldowns ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" /> Carregando...
              </div>
            ) : domainCooldowns.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhum domínio em repouso. Operação em taxa nominal.
              </div>
            ) : (
              domainCooldowns.map((cd) => (
                <div key={cd.domain} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground truncate">{cd.domain}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{cd.reason || "Rate limit"}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      Até {new Date(cd.cooldown_until).toLocaleTimeString("pt-BR")}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetCooldown(cd.domain)}
                    disabled={isResettingCooldown === cd.domain}
                    className="h-8 px-2.5 rounded-lg text-xs font-normal shrink-0"
                  >
                    {isResettingCooldown === cd.domain ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3 mr-1" />
                    )}
                    Liberar
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block rounded-xl border border-border/40 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 border-b border-border/40">
                  <TableHead className="text-xs font-normal text-muted-foreground">Domínio</TableHead>
                  <TableHead className="w-[180px] text-xs font-normal text-muted-foreground">Motivo</TableHead>
                  <TableHead className="w-[100px] text-xs font-normal text-muted-foreground">Status HTTP</TableHead>
                  <TableHead className="w-[90px] text-xs font-normal text-muted-foreground">Falhas</TableHead>
                  <TableHead className="w-[160px] text-xs font-normal text-muted-foreground">Repouso Até</TableHead>
                  <TableHead className="w-[110px] text-right text-xs font-normal text-muted-foreground">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingCooldowns ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" />
                      Carregando telemetria...
                    </TableCell>
                  </TableRow>
                ) : domainCooldowns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                      Nenhum domínio em repouso ativo. Todos os scrapers com tráfego liberado.
                    </TableCell>
                  </TableRow>
                ) : (
                  domainCooldowns.map((cd) => (
                    <TableRow key={cd.domain} className="border-b border-border/30">
                      <TableCell className="font-medium text-xs text-foreground">
                        {cd.domain}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {cd.reason || "Rate limit"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {cd.last_http_status || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {cd.failure_count || 1}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(cd.cooldown_until).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetCooldown(cd.domain)}
                          disabled={isResettingCooldown === cd.domain}
                          className="h-7 px-2 rounded-lg text-xs font-normal gap-1 cursor-pointer"
                        >
                          {isResettingCooldown === cd.domain ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Liberar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 2: FILA DE CRAWLING */}
        <TabsContent value="queue" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {["all", "pending", "processing", "completed", "failed"].map((st) => (
                <Button
                  key={st}
                  variant={queueStatusFilter === st ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setQueueStatusFilter(st)}
                  className="h-8 px-2.5 rounded-lg text-xs font-normal capitalize"
                >
                  {st === "all" ? "Todos" : st}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSeedModalOpen(true)}
              className="h-8 px-2.5 rounded-lg text-xs font-normal gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Semente
            </Button>
          </div>

          {/* Mobile: Navegação em lista limpa (WhatsApp style) */}
          <div className="block sm:hidden divide-y divide-border/40 rounded-xl border border-border/40 bg-card overflow-hidden">
            {isLoadingQueue ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" /> Carregando...
              </div>
            ) : queueItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Nenhum item na fila.</div>
            ) : (
              queueItems.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground truncate">{item.domain}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{item.url}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono">{item.status}</span>
                    <div className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString("pt-BR")}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block rounded-xl border border-border/40 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 border-b border-border/40">
                  <TableHead className="w-[140px] text-xs font-normal text-muted-foreground">Domínio</TableHead>
                  <TableHead className="text-xs font-normal text-muted-foreground">URL</TableHead>
                  <TableHead className="w-[90px] text-xs font-normal text-muted-foreground">Prioridade</TableHead>
                  <TableHead className="w-[110px] text-xs font-normal text-muted-foreground">Status</TableHead>
                  <TableHead className="w-[110px] text-right text-xs font-normal text-muted-foreground">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingQueue ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" />
                      Carregando fila...
                    </TableCell>
                  </TableRow>
                ) : queueItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                      Nenhum item encontrado nesta visualização.
                    </TableCell>
                  </TableRow>
                ) : (
                  queueItems.map((item) => (
                    <TableRow key={item.id} className="border-b border-border/30">
                      <TableCell className="font-medium text-xs text-foreground truncate max-w-[140px]">
                        {item.domain}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[340px]">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-foreground inline-flex items-center gap-1"
                        >
                          <span className="truncate">{item.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" />
                        </a>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">P{item.priority}</TableCell>
                      <TableCell>
                        <span className="text-[11px] text-muted-foreground capitalize">
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 3: EMPRESAS */}
        <TabsContent value="businesses" className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou atividade..."
                  value={businessSearch}
                  onChange={(e) => setBusinessSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadBusinesses()}
                  className="pl-8 h-9 rounded-xl text-xs border-border/50"
                />
              </div>
              <Button
                variant="outline"
                onClick={loadBusinesses}
                className="h-9 px-3.5 rounded-xl text-xs font-normal cursor-pointer"
              >
                Buscar
              </Button>
            </div>

            <Button
              variant="outline"
              disabled={isGeneratingGhost}
              onClick={handleGenerateGhostStores}
              className="h-9 px-3.5 rounded-xl text-xs font-medium gap-1.5 cursor-pointer shrink-0"
            >
              {isGeneratingGhost ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span>Gerar Ghost Stores (&gt;80% Score)</span>
            </Button>
          </div>

          {/* Mobile: Lista WhatsApp Style */}
          <div className="block sm:hidden divide-y divide-border/40 rounded-xl border border-border/40 bg-card overflow-hidden">
            {isLoadingBusinesses ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" /> Carregando...
              </div>
            ) : businesses.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Nenhuma empresa encontrada.</div>
            ) : (
              businesses.map((biz) => (
                <div key={biz.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground truncate">{biz.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{biz.category || biz.cnpj || "Empresa"}</div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className="text-[10px] font-mono font-medium text-foreground">{biz.data_quality_score}%</span>
                    {biz.data_quality_score >= 80 ? (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Ghost Tenant</span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground">{biz.city || "—"}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block rounded-xl border border-border/40 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 border-b border-border/40">
                  <TableHead className="text-xs font-normal text-muted-foreground">Empresa</TableHead>
                  <TableHead className="w-[140px] text-xs font-normal text-muted-foreground">CNPJ</TableHead>
                  <TableHead className="w-[160px] text-xs font-normal text-muted-foreground">Localização</TableHead>
                  <TableHead className="w-[100px] text-xs font-normal text-muted-foreground">Qualidade</TableHead>
                  <TableHead className="w-[120px] text-xs font-normal text-muted-foreground">Ghost Tenant</TableHead>
                  <TableHead className="w-[90px] text-right text-xs font-normal text-muted-foreground">Fonte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingBusinesses ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" />
                      Carregando empresas...
                    </TableCell>
                  </TableRow>
                ) : businesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-xs text-muted-foreground">
                      Nenhuma empresa encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  businesses.map((biz) => (
                    <TableRow key={biz.id} className="border-b border-border/30">
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">{biz.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">{biz.category}</div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {biz.cnpj || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {biz.city ? `${biz.city}/${biz.state || ""}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {biz.data_quality_score}%
                      </TableCell>
                      <TableCell className="text-xs">
                        {biz.data_quality_score >= 80 ? (
                          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                            Elegível / Ativa
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Pendente</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs capitalize text-muted-foreground">
                        {biz.source}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 4: INDICADORES BCB */}
        <TabsContent value="market" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Séries Oficiais do Banco Central</h3>
              <p className="text-[11px] text-muted-foreground">Agendado no pg_cron: 2x ao dia às 08h e 18h BRT</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDispatchCron("market-data")}
                disabled={isDispatchingCron === "market-data"}
                className="h-8 px-2.5 rounded-lg text-xs font-normal cursor-pointer"
              >
                {isDispatchingCron === "market-data" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                )}
                Executar Cron Agora
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadIndicators}
                disabled={isLoadingIndicators}
                className="h-8 px-2.5 rounded-lg text-xs font-normal cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingIndicators ? "animate-spin" : ""}`} />
                Recarregar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {isLoadingIndicators ? (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" />
                Consultando API SGS do Banco Central...
              </div>
            ) : indicators.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
                Nenhum indicador carregado. Clique em Recarregar.
              </div>
            ) : (
              indicators.map((ind) => (
                <div key={ind.code} className="p-3.5 rounded-xl border border-border/40 bg-card space-y-1.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{ind.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono">{ind.type}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-semibold text-foreground">
                      {ind.currentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-muted-foreground">{ind.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                    <span>Ref: {ind.referenceDate}</span>
                    {ind.variationPercent !== undefined && (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {ind.variationPercent > 0 ? "+" : ""}{ind.variationPercent}%
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* TAB 5: FEEDS RSS */}
        <TabsContent value="feeds" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Feeds RSS Cadastrados</h3>
              <p className="text-[11px] text-muted-foreground">Agendado no pg_cron: a cada 30 minutos</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDispatchCron("rss-fetcher")}
                disabled={isDispatchingCron === "rss-fetcher"}
                className="h-8 px-2.5 rounded-lg text-xs font-normal cursor-pointer"
              >
                {isDispatchingCron === "rss-fetcher" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                )}
                Executar Cron Agora
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFeedModalOpen(true)}
                className="h-8 px-2.5 rounded-lg text-xs font-normal gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Feed
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 border-b border-border/40">
                  <TableHead className="text-xs font-normal text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-xs font-normal text-muted-foreground">Feed URL</TableHead>
                  <TableHead className="w-[100px] text-xs font-normal text-muted-foreground">Status</TableHead>
                  <TableHead className="w-[100px] text-right text-xs font-normal text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingFeeds ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" />
                      Carregando feeds...
                    </TableCell>
                  </TableRow>
                ) : feeds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-xs text-muted-foreground">
                      Nenhum feed cadastrado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  feeds.map((feed) => (
                    <TableRow key={feed.id} className="border-b border-border/30">
                      <TableCell className="font-medium text-xs text-foreground">
                        {feed.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-sm">
                        {feed.feed_url}
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] text-muted-foreground">
                          {feed.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRunScraper("rss-fetcher", { targetUrl: feed.feed_url })}
                          disabled={Boolean(isRunningScraper)}
                          className="h-7 px-2 rounded-lg text-xs font-normal"
                        >
                          Sincronizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 6: AUDITORIA */}
        <TabsContent value="audit" className="space-y-3">
          <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 border-b border-border/40">
                  <TableHead className="w-[140px] text-xs font-normal text-muted-foreground">Minerador</TableHead>
                  <TableHead className="text-xs font-normal text-muted-foreground">Ação</TableHead>
                  <TableHead className="w-[90px] text-xs font-normal text-muted-foreground">Afetados</TableHead>
                  <TableHead className="w-[90px] text-xs font-normal text-muted-foreground">Duração</TableHead>
                  <TableHead className="w-[130px] text-right text-xs font-normal text-muted-foreground">Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAudit ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1.5" />
                      Carregando logs...
                    </TableCell>
                  </TableRow>
                ) : auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-xs text-muted-foreground">
                      Nenhum registro de auditoria disponível.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log.id} className="border-b border-border/30">
                      <TableCell className="font-medium text-xs text-foreground">
                        {log.scraper_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.action}
                        {log.error_message && (
                          <div className="text-destructive text-[11px] truncate max-w-sm mt-0.5">
                            {log.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.records_affected}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.duration_ms ? `${log.duration_ms}ms` : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL: Adicionar Semente de Crawl */}
      <Dialog open={isSeedModalOpen} onOpenChange={setIsSeedModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/40">
          <form onSubmit={handleAddSeed}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Adicionar Semente</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Cadastre um domínio para enfileiramento na exploração contínua.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <label className="text-xs text-foreground">Nome</label>
                <Input
                  placeholder="Ex: Portal Regional"
                  value={newSeedName}
                  onChange={(e) => setNewSeedName(e.target.value)}
                  className="rounded-xl h-10 text-xs border-border/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-foreground">URL Inicial</label>
                <Input
                  placeholder="https://exemplo.com.br"
                  type="url"
                  required
                  value={newSeedUrl}
                  onChange={(e) => setNewSeedUrl(e.target.value)}
                  className="rounded-xl h-10 text-xs border-border/50"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSeedModalOpen(false)}
                className="rounded-xl text-xs font-normal"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingSeed}
                className="rounded-xl text-xs font-medium shadow-none"
              >
                {isSubmittingSeed ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Adicionar Feed RSS */}
      <Dialog open={isFeedModalOpen} onOpenChange={setIsFeedModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/40">
          <form onSubmit={handleAddFeed}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Cadastrar Feed RSS</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Adicione o endpoint XML do feed para monitoramento automático.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <label className="text-xs text-foreground">Nome</label>
                <Input
                  placeholder="Ex: Canal Tech / G1"
                  required
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                  className="rounded-xl h-10 text-xs border-border/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-foreground">URL do Feed (XML/RSS)</label>
                <Input
                  placeholder="https://exemplo.com.br/feed.xml"
                  type="url"
                  required
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="rounded-xl h-10 text-xs border-border/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-foreground">Website (Opcional)</label>
                <Input
                  placeholder="https://exemplo.com.br"
                  type="url"
                  value={newFeedSiteUrl}
                  onChange={(e) => setNewFeedSiteUrl(e.target.value)}
                  className="rounded-xl h-10 text-xs border-border/50"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFeedModalOpen(false)}
                className="rounded-xl text-xs font-normal"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingFeed}
                className="rounded-xl text-xs font-medium shadow-none"
              >
                {isSubmittingFeed ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Salvar Feed
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE PRODUTO MINERADO */}
      <Dialog open={Boolean(editingProduct)} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Editar Produto Minerado</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajuste título, preço e status antes de importar para o catálogo oficial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Título do Produto</label>
              <Input
                value={editProductTitle}
                onChange={(e) => setEditProductTitle(e.target.value)}
                placeholder="Ex: Tênis Esportivo Pro..."
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Preço (R$)</label>
                <Input
                  value={editProductPrice}
                  onChange={(e) => setEditProductPrice(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  className="h-9 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Status</label>
                <select
                  value={editProductStatus}
                  onChange={(e) => setEditProductStatus(e.target.value)}
                  className="w-full h-9 rounded-xl text-xs bg-background border border-border/60 px-2.5"
                >
                  <option value="pending_review">Pendente</option>
                  <option value="approved">Aprovado</option>
                  <option value="rejected">Rejeitado</option>
                  <option value="synced">Sincronizado</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">URL da Imagem</label>
              <Input
                value={editProductImage}
                onChange={(e) => setEditProductImage(e.target.value)}
                placeholder="https://..."
                className="h-9 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Descrição</label>
              <textarea
                value={editProductDescription}
                onChange={(e) => setEditProductDescription(e.target.value)}
                rows={3}
                placeholder="Detalhes adicionais..."
                className="w-full rounded-xl text-xs bg-background border border-border/60 p-2.5 focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingProduct(null)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveProductEdit}
              disabled={isSavingProductEdit}
              className="rounded-xl text-xs font-medium"
            >
              {isSavingProductEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE IMPORTAÇÃO PARA LOJA */}
      <Dialog open={Boolean(importingProduct)} onOpenChange={(open) => !open && setImportingProduct(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Importar para Loja Oficial</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Insira o item no catálogo canônico da loja oficial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40 space-y-1">
              <div className="text-xs font-bold text-foreground">{importingProduct?.title}</div>
              <div className="text-xs text-muted-foreground">
                Origem: {importingProduct?.source_domain} • Preço:{" "}
                {importingProduct?.price_cents
                  ? (importingProduct.price_cents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "Sob consulta"}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">UUID da Loja de Destino (store_id)</label>
              <Input
                value={importTargetStoreId}
                onChange={(e) => setImportTargetStoreId(e.target.value)}
                placeholder="Ex: 8f44d8b2-..."
                className="h-9 rounded-xl text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                O produto será publicado no catálogo e visível para compra ou reserva.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setImportingProduct(null)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmImport}
              disabled={isImportingProduct || !importTargetStoreId.trim()}
              className="rounded-xl text-xs font-medium"
            >
              {isImportingProduct ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Confirmar Importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
