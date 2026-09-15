/**
 * admin-master.mining.tsx — Mining Hub & Content Factory
 * Pipeline completo: Fila → Artigos Minerados (Curadoria) → Publicação
 * Inclui: Feeds RSS, Scrapers por Domínio, Importação Manual, Billing de Tokens
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useTransition, useRef } from "react";
import {
 Globe,
 Rss,
 Queue,
 Plus,
 Clock,
 CheckCircle,
 XCircle,
 ArrowClockwise,
 Play,
 SpinnerGap,
 Warning,
 Eye,
 ThumbsUp,
 ThumbsDown,
 MagnifyingGlass,
 Robot,
 Database,
 Broadcast,
 Shield,
 Lightning,
 Star,
 ArrowRight,
 ToggleLeft,
 ToggleRight,
 Funnel,
 PencilSimple,
 TrashSimple,
 Ticket,
 Buildings,
 ArrowsClockwise,
 Calendar,
 MapPin,
 CurrencyDollar,
 ArrowSquareOut,
 FileText,
 Check,
 Users,
 Briefcase,
 Article,
 Sparkle,
 LinkSimple,
} from "@phosphor-icons/react";
import {
 getMiningStats,
 listCrawlQueue,
 listRssFeeds,
 listMinedArticles,
 listScraperConfigs,
 addUrlToCrawlQueue,
 processUrlWithAI,
 curateMineArticle,
 triggerRssFeedFetch,
 upsertRssFeed,
 toggleRssFeed,
 reprocessFailedQueueItems,
 syncPncpMunicipalBids,
 listPncpContractsAction,
 convertPncpBidToNewsArticle,
 type MinedArticleDTO,
 type ScraperConfigDTO,
} from "@/services/mining.functions";
import {
  isHealthyImageUrl,
  getFallbackThematicImage,
} from "@/services/mining/integrity-gate";
import {
  mineAndPublishExternalJob,
  listExternalJobs,
  type JobItemDTO,
} from "@/services/jobs.functions";
import {
 mineAndPublishExternalEvent,
 listExternalEvents,
} from "@/services/events/external-events.functions";
import { generateCarouselFromMinedContent } from "@/services/studio.functions";
import { CarouselStudioEditor } from "@/components/studio/carousel-studio-editor";
import type { EscamasCarouselProject } from "@/types/studio-machine";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin-master/mining")({
  head: () => ({ meta: [{ title: "Mining Hub & Content Factory | Admin Master" }] }),
  loader: async () => {
    try {
      const [stats, queue, feeds, mined, scrapers, events, jobs] = await Promise.all([
        getMiningStats().catch(() => ({
          queue: { pending: 0, processing: 0, completed: 0, failed: 0 },
          mined: { pending_review: 0, approved: 0, rejected: 0, published: 0, processing: 0, failed: 0, avg_quality: 0 },
          feeds: { total: 0, active: 0, total_items: 0, total_published: 0 },
          scrapers: { total: 0, active: 0, blocked: 0, total_scraped: 0 },
        })),
        listCrawlQueue({ data: { limit: 50 } }).catch(() => ({ items: [], total: 0 })),
        listRssFeeds().catch(() => []),
        listMinedArticles({ data: { limit: 30 } }).catch(() => ({ items: [], total: 0 })),
        listScraperConfigs().catch(() => []),
        listExternalEvents({ data: { city: "Chapecó", limit: 30 } }).catch(() => []),
        listExternalJobs({ data: { limit: 30 } }).catch(() => []),
      ]);
      return { stats, queue, feeds, mined, scrapers, events, jobs };
    } catch {
      return {
        stats: {
          queue: { pending: 0, processing: 0, completed: 0, failed: 0 },
          mined: { pending_review: 0, approved: 0, rejected: 0, published: 0, processing: 0, failed: 0, avg_quality: 0 },
          feeds: { total: 0, active: 0, total_items: 0, total_published: 0 },
          scrapers: { total: 0, active: 0, blocked: 0, total_scraped: 0 },
        },
        queue: { items: [], total: 0 },
        feeds: [],
        mined: { items: [], total: 0 },
        scrapers: [],
        events: [],
        jobs: [],
      };
    }
  },
  component: AdminMiningHubPage,
});

type Tab = "mined" | "queue" | "events" | "pncp" | "jobs" | "feeds" | "scrapers" | "import";

function AdminMiningHubPage() {
  const { stats, queue: initialQueue, feeds: initialFeeds, mined: initialMined, scrapers: initialScrapers, events: initialEvents, jobs: initialJobs } = ((Route.useLoaderData?.() as any) || {});
  const [activeTab, setActiveTab] = useState<Tab>("mined");
  const [isPending, startTransition] = useTransition();

  // State local para mutações otimistas
  const [minedItems, setMinedItems] = useState<MinedArticleDTO[]>(initialMined.items as MinedArticleDTO[]);
  const [queueItems, setQueueItems] = useState(initialQueue.items || []);
  const [feeds, setFeeds] = useState<any[]>(initialFeeds as any[]);
  const [scrapers] = useState<ScraperConfigDTO[]>(initialScrapers as ScraperConfigDTO[]);
  const [eventsList, setEventsList] = useState<any[]>(initialEvents || []);
  const [jobsList, setJobsList] = useState<JobItemDTO[]>(initialJobs || []);
  const [pncpList, setPncpList] = useState<any[]>([]);
  const [convertingPncpId, setConvertingPncpId] = useState<string | null>(null);
  const [isReprocessingQueue, setIsReprocessingQueue] = useState(false);
  const [isSyncingPncp, setIsSyncingPncp] = useState(false);
  const [eventInputUrl, setEventInputUrl] = useState("");
  const [isMiningEvent, setIsMiningEvent] = useState(false);

  // Vagas form
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [jobCategory, setJobCategory] = useState<any>("clt");
  const [jobLocation, setJobLocation] = useState("Chapecó, SC");
  const [jobSalary, setJobSalary] = useState("A combinar");
  const [jobUrl, setJobUrl] = useState("");
  const [jobSource, setJobSource] = useState("Portal Regional");
  const [jobDesc, setJobDesc] = useState("");
  const [isMiningJob, setIsMiningJob] = useState(false);

 // Curadoria: estado do artigo em foco
 const [focusedArticle, setFocusedArticle] = useState<MinedArticleDTO | null>(null);
 const [titleOverride, setTitleOverride] = useState("");
 const [kickerOverride, setKickerOverride] = useState("");
 const [categoryOverride, setCategoryOverride] = useState("");
 const [curatorNotes, setCuratorNotes] = useState("");
 const [curatingId, setCuratingId] = useState<string | null>(null);

 // Import URL form
 const [importUrl, setImportUrl] = useState("");
 const [importTone, setImportTone] = useState<"editorial" | "profissional" | "tecnico" | "persuasivo" | "minimalista">("editorial");
 const [importContentType, setImportContentType] = useState<"news" | "blog_post" | "recipe">("news");
 const [isImporting, setIsImporting] = useState(false);

 // RSS form
 const [feedName, setFeedName] = useState("");
 const [feedUrl, setFeedUrl] = useState("");
 const [fetchingFeedId, setFetchingFeedId] = useState<string | null>(null);

 // Filter mined
 const [minedFilter, setMinedFilter] = useState<"all" | "pending_review" | "published" | "rejected">("pending_review");

 // Studio Machine & Escamas Carousel
 const [studioProject, setStudioProject] = useState<EscamasCarouselProject | null>(null);
 const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false);

 const handleGenerateCarousel = async (contentType: "noticias" | "licitacoes" | "eventos" | "empregos", item: any) => {
   setIsGeneratingCarousel(true);
   try {
     let payload: any = {
       contentType,
       itemId: item.id || item.numeroControlePNCP,
       title: item.title || item.raw_title || item.objetoContratacao || "Oportunidade Waesy",
       summary: item.summary || item.extracted_summary || item.objetoContratacao || item.description || "",
       coverUrl: item.ai_suggested_cover_url || item.cover_url || item.banner_url || null,
       details: item,
     };

     if (contentType === "noticias" && focusedArticle) {
       payload.title = titleOverride || focusedArticle.ai_structured_title || focusedArticle.raw_title;
       payload.summary = focusedArticle.ai_structured_subtitle || focusedArticle.ai_summary || "";
       payload.details = {
         category: focusedArticle.ai_suggested_category,
         ai_structured_sections: focusedArticle.ai_structured_sections,
       };
     }

     const res = await generateCarouselFromMinedContent({ data: payload });
     setStudioProject(res.project);
     toast.success("Carrossel sintetizado no Studio Machine!");
   } catch (err: any) {
     toast.error("Erro ao gerar carrossel: " + (err.message || "Tente novamente."));
   } finally {
     setIsGeneratingCarousel(false);
   }
 };

 // ─── Curadoria ───────────────────────────────────────────────────────────

 const handleCurate = (article: MinedArticleDTO) => {
 setFocusedArticle(article);
 setTitleOverride(article.ai_structured_title || "");
 setKickerOverride(article.ai_suggested_kicker || "");
 setCategoryOverride(article.ai_suggested_category || "");
 setCuratorNotes("");
 };

 const handleApprove = () => {
 if (!focusedArticle) return;
 setCuratingId(focusedArticle.id);
 startTransition(async () => {
 try {
 await curateMineArticle({
 data: {
 mined_article_id: focusedArticle.id,
 action: "approve",
 curator_notes: curatorNotes || undefined,
 title_override: titleOverride !== focusedArticle.ai_structured_title ? titleOverride : undefined,
 kicker_override: kickerOverride !== focusedArticle.ai_suggested_kicker ? kickerOverride : undefined,
 category_override: categoryOverride !== focusedArticle.ai_suggested_category ? categoryOverride : undefined,
 },
 });
 toast.success("Matéria aprovada e publicada!");
 setMinedItems((prev) => prev.map((m) => m.id === focusedArticle.id ? { ...m, status: "published" as const } : m));
 setFocusedArticle(null);
 } catch (err: any) {
 toast.error(err.message || "Erro ao aprovar matéria");
 } finally {
 setCuratingId(null);
 }
 });
 };

 const handleReject = () => {
 if (!focusedArticle) return;
 setCuratingId(focusedArticle.id);
 startTransition(async () => {
 try {
 await curateMineArticle({
 data: {
 mined_article_id: focusedArticle.id,
 action: "reject",
 curator_notes: curatorNotes || "Não atende os critérios editoriais.",
 },
 });
 toast.success("Matéria rejeitada.");
 setMinedItems((prev) => prev.map((m) => m.id === focusedArticle.id ? { ...m, status: "rejected" as const } : m));
 setFocusedArticle(null);
 } catch (err: any) {
 toast.error(err.message || "Erro ao rejeitar matéria");
 } finally {
 setCuratingId(null);
 }
 });
 };

 // ─── Import URL ──────────────────────────────────────────────────────────

 const handleImportUrl = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!importUrl) return;
 setIsImporting(true);
 try {
 const result = await processUrlWithAI({
 data: {
 url: importUrl,
 content_type: importContentType,
 tone: importTone,
 auto_enqueue: true,
 consume_tokens: false,
 },
 });
 toast.success(`Artigo extraído com IA! Qualidade: ${result.quality_score}/100`);
 setMinedItems((prev) => [result as any, ...prev]);
 setImportUrl("");
 setActiveTab("mined");
 } catch (err: any) {
 toast.error(err.message || "Erro ao processar URL");
 } finally {
 setIsImporting(false);
 }
 };

 // ─── RSS Fetch ───────────────────────────────────────────────────────────

 const handleFetchRss = (feedId: string) => {
 setFetchingFeedId(feedId);
 startTransition(async () => {
 try {
 const result = await triggerRssFeedFetch({ data: { feed_id: feedId } });
 toast.success(`RSS processado! ${result.fetched} novos itens enfileirados.`);
 setFeeds((prev) => prev.map((f) => f.id === feedId
 ? { ...f, last_fetched_at: new Date().toISOString(), items_count: (f.items_count || 0) + result.fetched }
 : f
 ));
 } catch (err: any) {
 toast.error(err.message || "Erro ao buscar feed RSS");
 } finally {
 setFetchingFeedId(null);
 }
 });
 };

 const handleToggleFeed = (feedId: string, currentActive: boolean) => {
 startTransition(async () => {
 try {
 await toggleRssFeed({ data: { id: feedId, is_active: !currentActive } });
 setFeeds((prev) => prev.map((f) => f.id === feedId ? { ...f, is_active: !currentActive } : f));
 toast.success(!currentActive ? "Feed ativado." : "Feed desativado.");
 } catch (err: any) {
 toast.error(err.message || "Erro ao alternar feed");
 }
 });
 };

 const handleAddFeed = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!feedName || !feedUrl) return;
 startTransition(async () => {
 try {
 const feed = await upsertRssFeed({
 data: { name: feedName, feed_url: feedUrl, content_type: "news", region: "Brasil" },
 });
 setFeeds((prev) => [...prev, feed]);
 toast.success("Feed RSS cadastrado!");
 setFeedName(""); setFeedUrl("");
 } catch (err: any) {
 toast.error(err.message || "Erro ao cadastrar feed");
 }
 });
 };

 // ─── Utilitários ─────────────────────────────────────────────────────────

 const filteredMined = minedFilter === "all"
 ? minedItems
 : minedItems.filter((m) => m.status === minedFilter);

 const qualityColor = (score: number | null) => {
 if (!score) return "text-muted-foreground";
 if (score >= 75) return "text-emerald-500";
 if (score >= 50) return "text-amber-500";
 return "text-red-400";
 };

 const statusBadge = (status: string) => {
 const map: Record<string, { label: string; cls: string }> = {
 pending_review: { label: "Aguardando Curadoria", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
 approved: { label: "Aprovado", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
 published: { label: "Publicado", cls: "bg-primary/10 text-primary" },
 rejected: { label: "Rejeitado", cls: "bg-destructive/10 text-destructive" },
 processing: { label: "Processando", cls: "bg-primary/10 text-primary" },
 failed: { label: "Falhou", cls: "bg-destructive/10 text-destructive" },
 };
 const s = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
 return (
 <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>
 {s.label}
 </span>
 );
 };

  const handleReprocessFailedQueue = async () => {
    setIsReprocessingQueue(true);
    try {
      const res = await reprocessFailedQueueItems({ data: { limit: 20 } });
      toast.success(`${res.reprocessed} itens re-extraídos mecanicamente com sucesso!`);
      const updated = await listCrawlQueue({ data: { limit: 50 } });
      setQueueItems(updated.items || []);
      const updatedMined = await listMinedArticles({ data: { limit: 30 } });
      setMinedItems(updatedMined.items as MinedArticleDTO[]);
    } catch (err: any) {
      toast.error(`Falha ao reprocessar: ${err.message}`);
    } finally {
      setIsReprocessingQueue(false);
    }
  };

  const handleReprocessSingle = async (item: any) => {
    try {
      toast.loading(`Re-extraindo mecanicamente ${item.domain}...`, { id: `rep-${item.id}` });
      await processUrlWithAI({
        data: {
          url: item.url,
          content_type: (item.content_type || "news") as any,
          auto_enqueue: false,
          consume_tokens: false,
        },
      });
      toast.success(`Conteúdo de ${item.domain} extraído e curado com sucesso!`, { id: `rep-${item.id}` });
      const updated = await listCrawlQueue({ data: { limit: 50 } });
      setQueueItems(updated.items || []);
      const updatedMined = await listMinedArticles({ data: { limit: 30 } });
      setMinedItems(updatedMined.items as MinedArticleDTO[]);
    } catch (err: any) {
      toast.error(`Falha: ${err.message}`, { id: `rep-${item.id}` });
    }
  };

  const handleSyncPncpContracts = async () => {
    setIsSyncingPncp(true);
    try {
      toast.loading("Consultando API oficial do PNCP para Chapecó...", { id: "pncp" });
      const res = await syncPncpMunicipalBids({ data: { city: "Chapecó", uf: "SC", limit: 20 } });
      toast.success(`${res.inserted} editais municipais sincronizados!`, { id: "pncp" });
      const contracts = await listPncpContractsAction({ data: { city: "Chapecó", uf: "SC", limit: 20 } });
      setPncpList(contracts);
    } catch (err: any) {
      toast.error(`Erro PNCP: ${err.message}`, { id: "pncp" });
    } finally {
      setIsSyncingPncp(false);
    }
  };

  const handleMineExternalEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventInputUrl) return;
    setIsMiningEvent(true);
    try {
      toast.loading("Extraindo dados do evento e redigindo matéria...", { id: "event" });
      const res = await mineAndPublishExternalEvent({
        data: {
          url: eventInputUrl,
          target_city: "Chapecó",
          generate_news_coverage: true,
        },
      });
      toast.success(`Evento "${res.event?.title}" publicado com sucesso! Notícia de cobertura vinculada.`, { id: "event" });
      setEventInputUrl("");
      const updatedEvents = await listExternalEvents({ data: { city: "Chapecó", limit: 30 } });
      setEventsList(updatedEvents);
    } catch (err: any) {
      toast.error(`Erro ao minerar evento: ${err.message}`, { id: "event" });
    } finally {
      setIsMiningEvent(false);
    }
  };

  const handleCreateNewsFromPncp = async (item: any) => {
    const id = item.numeroControlePNCP || String(Math.random());
    setConvertingPncpId(id);
    try {
      await convertPncpBidToNewsArticle({
        data: {
          contract_id: id,
          objeto: item.objetoContratacao || "Contratação de bens ou serviços",
          orgao: item.orgaoEntidade?.razaoSocial || item.unidadeOrgao?.municipioNome || "Prefeitura Municipal",
          numero_edital: item.numeroControlePNCP,
          modalidade: item.modalidadeNome || "Licitação Pública",
          valor_estimado: item.valorTotalEstimado ? Number(item.valorTotalEstimado) : null,
          url_portal: `https://pncp.gov.br/app/editais/${id}`,
          data_publicacao: item.dataPublicacaoPncp,
          city: "Chapecó",
        },
      });

      toast.success("Pauta de edital gerada com sucesso e enviada para curadoria!");
      const updated = await listMinedArticles({ data: { limit: 30 } });
      setMinedItems(updated.items as MinedArticleDTO[]);
      setActiveTab("mined");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar pauta de edital.");
    } finally {
      setConvertingPncpId(null);
    }
  };

  const handlePublishExternalJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !jobCompany || !jobUrl) {
      toast.error("Preencha título, empresa e URL oficial da vaga.");
      return;
    }
    setIsMiningJob(true);
    try {
      await mineAndPublishExternalJob({
        data: {
          title: jobTitle,
          company_name: jobCompany,
          category: jobCategory,
          location: jobLocation,
          salary_display: jobSalary,
          external_url: jobUrl,
          external_source: jobSource,
          description: jobDesc || `Oportunidade profissional na empresa ${jobCompany} em ${jobLocation}. Candidate-se através do link oficial.`,
          application_mode: "external_link",
        },
      });

      toast.success(`Vaga "${jobTitle}" publicada com sucesso!`);
      setJobTitle("");
      setJobCompany("");
      setJobUrl("");
      setJobDesc("");
      const updated = await listExternalJobs({ data: { limit: 30 } });
      setJobsList(updated);
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar vaga externa.");
    } finally {
      setIsMiningJob(false);
    }
  };

  const TABS: { id: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: "mined", icon: <Robot className="h-4 w-4" />, label: "Artigos Minerados", badge: stats.mined.pending_review },
    { id: "queue", icon: <Queue className="h-4 w-4" />, label: "Fila de Extração", badge: stats.queue.pending },
    { id: "events", icon: <Ticket className="h-4 w-4" />, label: "Eventos & RSVP", badge: eventsList.length },
    { id: "pncp", icon: <Buildings className="h-4 w-4" />, label: "Editais & PNCP", badge: pncpList.length },
    { id: "jobs", icon: <Briefcase className="h-4 w-4" />, label: "Vagas & Empregos", badge: jobsList.length },
    { id: "feeds", icon: <Rss className="h-4 w-4" />, label: "Feeds RSS", badge: stats.feeds.active },
    { id: "scrapers", icon: <Globe className="h-4 w-4" />, label: "Scrapers", badge: stats.scrapers.active },
    { id: "import", icon: <Lightning className="h-4 w-4" />, label: "Importar URL" },
  ];

 return (
 <div className="min-h-screen bg-background">
 <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

 {/* ── Header ─────────────────────────────────────────────────────── */}
 <div className="mb-6 border-b border-border/40 pb-4">
 <h1 className="text-xl font-bold tracking-tight text-foreground">
 Extração & Curadoria de Conteúdo
 </h1>
 </div>

 {/* ── KPIs ───────────────────────────────────────────────────────── */}
 <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
 <StatCard icon={<Clock className="h-4 w-4 text-amber-400" />} label="Pendentes na Fila" value={stats.queue.pending} />
 <StatCard icon={<ArrowClockwise className="h-4 w-4 text-violet-400 animate-spin" />} label="Processando" value={stats.queue.processing} />
 <StatCard icon={<Warning className="h-4 w-4 text-amber-400" />} label="Aguardando Curadoria" value={stats.mined.pending_review} accent="amber" />
 <StatCard icon={<CheckCircle className="h-4 w-4 text-emerald-400" />} label="Publicados" value={stats.mined.published} accent="green" />
 <StatCard icon={<Rss className="h-4 w-4 text-blue-400" />} label="Feeds Ativos" value={stats.feeds.active} />
 <StatCard icon={<Star className="h-4 w-4 text-amber-400" />} label="Qualidade Média" value={`${stats.mined.avg_quality}%`} />
 </div>

 {/* ── Tabs ───────────────────────────────────────────────────────── */}
 <div className="mb-5 flex flex-wrap gap-2">
 {TABS.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
 activeTab === tab.id
 ? "bg-primary text-primary-foreground shadow-sm"
 : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
 }`}
 >
 {tab.icon}
 {tab.label}
 {tab.badge !== undefined && tab.badge > 0 && (
 <span className={`ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
 activeTab === tab.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
 }`}>
 {tab.badge}
 </span>
 )}
 </button>
 ))}
 </div>

 {/* ══════════════════════════════════════════════════════════════════
 ABA 1: Artigos Minerados (Curadoria)
 ══════════════════════════════════════════════════════════════════ */}
 {activeTab === "mined" && (
 <div className="space-y-4">
        {/* Panel de curadoria: TRUTHFUL PREVIEW */}
        {focusedArticle && (
          <div className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-6 space-y-6 shadow-sm">
            {/* Top Header */}
            <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
                    Inspeção & Curadoria Forense
                  </span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs font-mono text-muted-foreground">{focusedArticle.source_domain}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    (focusedArticle.quality_score ?? 0) >= 80 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                  }`}>
                    Qualidade: {focusedArticle.quality_score ?? "--"}/100
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {focusedArticle.word_count} palavras
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {Math.max(1, Math.ceil(focusedArticle.word_count / 180))} min de leitura
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <a
                    href={focusedArticle.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    Fonte Original: <span className="font-mono text-muted-foreground truncate max-w-md">{focusedArticle.source_url}</span>
                    <ArrowSquareOut className="h-3 w-3 shrink-0" />
                  </a>

                  <button
                    onClick={() => handleGenerateCarousel("noticias", focusedArticle)}
                    disabled={isGeneratingCarousel}
                    id="btn-generate-carousel-studio"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 px-3 py-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 disabled:opacity-50 transition-colors"
                  >
                    {isGeneratingCarousel ? (
                      <SpinnerGap className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkle className="h-3.5 w-3.5" />
                    )}
                    Gerar Carrossel no Studio
                  </button>
                </div>
              </div>
              <button
                onClick={() => setFocusedArticle(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-bold"
              >
                × Fechar
              </button>
            </div>

            {/* Truthful Preview: Diagramação Real do Artigo */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Coluna Esquerda: Preview Visual (7 cols) */}
              <div className="lg:col-span-7 space-y-4 border border-border/60 rounded-2xl p-4 sm:p-5 bg-background">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pré-Visualização Fidedigna
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {isHealthyImageUrl(focusedArticle.ai_suggested_cover_url) ? "✅ Capa Íntegra" : "🎨 Fallback Fotográfico"}
                  </span>
                </div>

                {/* Imagem de Capa com Recuperação Resiliente */}
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
                  <img
                    src={focusedArticle.ai_suggested_cover_url || getFallbackThematicImage(focusedArticle.ai_suggested_category)}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = getFallbackThematicImage(focusedArticle.ai_suggested_category);
                    }}
                  />
                </div>

                {/* Chapéu e Título */}
                <div className="space-y-1.5">
                  {(kickerOverride || focusedArticle.ai_suggested_kicker) && (
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {kickerOverride || focusedArticle.ai_suggested_kicker}
                    </span>
                  )}
                  <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                    {titleOverride || focusedArticle.ai_structured_title || focusedArticle.raw_title}
                  </h2>
                  {focusedArticle.ai_structured_subtitle && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {focusedArticle.ai_structured_subtitle}
                    </p>
                  )}
                </div>

                {/* Corpo Real: Seções ou Markdown */}
                <div className="space-y-3 pt-2 border-t border-border/40 max-h-72 overflow-y-auto pr-1">
                  {focusedArticle.ai_structured_sections && focusedArticle.ai_structured_sections.length > 0 ? (
                    focusedArticle.ai_structured_sections.map((sec, idx) => (
                      <div key={idx} className="space-y-1">
                        {sec.heading && (
                          <h4 className="text-xs font-bold text-foreground">{sec.heading}</h4>
                        )}
                        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                          {sec.content}
                        </p>
                      </div>
                    ))
                  ) : focusedArticle.extracted_markdown ? (
                    <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {focusedArticle.extracted_markdown}
                    </div>
                  ) : focusedArticle.ai_summary ? (
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      {focusedArticle.ai_summary}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">
                      Nenhum corpo extraído disponível para este item.
                    </p>
                  )}
                </div>
              </div>

              {/* Coluna Direita: Formulário de Curadoria & Overrides (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Título Editorial</label>
                  <input
                    value={titleOverride}
                    onChange={(e) => setTitleOverride(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Chapéu (Kicker)</label>
                    <input
                      value={kickerOverride}
                      onChange={(e) => setKickerOverride(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">Categoria</label>
                    <select
                      value={categoryOverride}
                      onChange={(e) => setCategoryOverride(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      {["cidade", "politica", "economia", "cultura", "esportes", "tecnologia", "urgente", "geral"].map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Notas do Curador</label>
                  <textarea
                    value={curatorNotes}
                    onChange={(e) => setCuratorNotes(e.target.value)}
                    rows={3}
                    placeholder="Observações da curadoria ou motivo da aprovação..."
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={curatingId === focusedArticle.id}
                    id="btn-approve-mined-article"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {curatingId === focusedArticle.id ? <SpinnerGap className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                    Aprovar & Publicar
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={curatingId === focusedArticle.id}
                    id="btn-reject-mined-article"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Rejeitar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

 {/* Filtros */}
 <div className="flex items-center gap-2">
 <Funnel className="h-4 w-4 text-muted-foreground" />
 {(["all", "pending_review", "published", "rejected"] as const).map((f) => (
 <button
 key={f}
 onClick={() => setMinedFilter(f)}
 className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
 minedFilter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
 }`}
 >
 {f === "all" ? "Todos" : f === "pending_review" ? "Pendentes" : f === "published" ? "Publicados" : "Rejeitados"}
 </button>
 ))}
 </div>

 {/* Lista */}
 {filteredMined.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-border bg-card/50 py-14 text-center">
 <Robot className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
 <p className="text-sm font-semibold text-muted-foreground">
 {minedFilter === "pending_review" ? "Nenhum artigo aguardando curadoria." : "Nenhum artigo encontrado."}
 </p>
 <p className="text-xs text-muted-foreground/70 mt-1">
 Use a aba "Importar URL com IA" ou ative Feeds RSS para gerar conteúdo.
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 {filteredMined.map((article) => (
 <div
 key={article.id}
 className={`rounded-2xl border bg-card p-4 transition-all ${
 focusedArticle?.id === article.id ? "border-primary/50 bg-primary/5" : "border-border"
 }`}
 >
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Cover com Resiliência */}
                  <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-muted shrink-0">
                    <img
                      src={article.ai_suggested_cover_url || getFallbackThematicImage(article.ai_suggested_category)}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = getFallbackThematicImage(article.ai_suggested_category);
                      }}
                    />
                    {!isHealthyImageUrl(article.ai_suggested_cover_url) && (
                      <span className="absolute bottom-0 right-0 rounded-tl-md bg-amber-500 text-[8px] font-bold px-1 text-white" title="Imagem gerada via fallback temático fotográfico">
                        HD
                      </span>
                    )}
                  </div>

 <div className="min-w-0 space-y-1">
 <div className="flex items-center gap-2 flex-wrap">
 {article.ai_suggested_kicker && (
 <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
 {article.ai_suggested_kicker}
 </span>
 )}
 {statusBadge(article.status)}
 {article.ai_sentiment && (
 <span className={`text-[10px] font-semibold ${
 article.ai_sentiment === "positive" ? "text-emerald-500" :
 article.ai_sentiment === "negative" ? "text-red-400" : "text-muted-foreground"
 }`}>
 {article.ai_sentiment}
 </span>
 )}
 </div>

 <h3 className="text-sm font-bold text-foreground line-clamp-2">
 {article.ai_structured_title || article.raw_title || "Sem título"}
 </h3>

 <div className="flex items-center gap-3 text-xs text-muted-foreground">
 <span className="font-mono truncate max-w-32">{article.source_domain}</span>
 <span>·</span>
 <span className={`font-bold ${qualityColor(article.quality_score)}`}>
 {article.quality_score ?? "--"}/100
 </span>
 <span>·</span>
 <span>{article.word_count} palavras</span>
 {article.ai_provider_used && (
 <>
 <span>·</span>
 <span className="flex items-center gap-1">
 <Robot className="h-3 w-3" />
 {article.ai_provider_used}
 </span>
 </>
 )}
 </div>

 {article.ai_summary && (
 <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
 {article.ai_summary}
 </p>
 )}

 {article.ai_suggested_tags && article.ai_suggested_tags.length > 0 && (
 <div className="flex items-center gap-1 mt-1 flex-wrap">
 {article.ai_suggested_tags.slice(0, 4).map((tag) => (
 <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
 #{tag}
 </span>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Ações */}
 {article.status === "pending_review" && (
 <button
 id={`btn-curate-${article.id}`}
 onClick={() => handleCurate(article)}
 className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/30 px-3 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
 >
 <Eye className="h-3.5 w-3.5" />
 Curar
 </button>
 )}
 {article.status === "published" && (
 <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary">
 <CheckCircle className="h-3 w-3" />
 Publicado
 </span>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {/* ══════════════════════════════════════════════════════════════════
 ABA 2: Fila de Crawling Mecânico & Resiliente
 ══════════════════════════════════════════════════════════════════ */}
 {activeTab === "queue" && (
 <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <h2 className="text-base font-bold text-foreground">URLs na Fila de Extração</h2>
 <p className="text-xs text-muted-foreground mt-0.5">
 {stats.queue.pending} pendentes · {stats.queue.processing} processando · {queueItems.filter((i: any) => i.status === "failed").length} com falha
 </p>
 </div>

 {queueItems.some((i: any) => i.status === "failed") && (
 <button
 onClick={handleReprocessFailedQueue}
 disabled={isReprocessingQueue}
 className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-all disabled:opacity-50"
 >
 {isReprocessingQueue ? (
 <SpinnerGap className="h-4 w-4 animate-spin" />
 ) : (
 <ArrowsClockwise className="h-4 w-4" />
 )}
 Reprocessar Falhas Mecanicamente ({queueItems.filter((i: any) => i.status === "failed").length})
 </button>
 )}
 </div>

 <div className="overflow-x-auto no-scrollbar">
 <table className="w-full text-left text-xs">
 <thead className="border-b border-border text-muted-foreground uppercase">
 <tr>
 <th className="py-2.5 pr-4 font-bold">Domínio & URL</th>
 <th className="py-2.5 pr-4 font-bold">Tipo</th>
 <th className="py-2.5 pr-4 font-bold">Prioridade</th>
 <th className="py-2.5 font-bold">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/60">
 {queueItems.length === 0 ? (
 <tr>
 <td colSpan={4} className="py-10 text-center text-muted-foreground">
 Fila vazia. Use "Importar URL com IA" para adicionar conteúdo.
 </td>
 </tr>
 ) : (
 queueItems.map((item: any) => (
 <tr key={item.id} className="hover:bg-muted/30 transition-colors">
 <td className="py-3 pr-4">
 <div className="font-semibold text-foreground">{item.domain}</div>
 <div className="max-w-xs truncate text-[11px] text-muted-foreground font-mono">{item.url}</div>
 </td>
 <td className="py-3 pr-4 font-semibold uppercase text-primary text-[11px]">
 {item.content_type || item.entity_type}
 </td>
  <td className="py-3 pr-4">
  <span className="font-mono text-foreground">{item.priority || 5}</span>
  </td>
  <td className="py-3">
  <div className="flex items-center gap-2">
  {statusBadge(item.status)}
  {item.status === "failed" && (
  <button
  onClick={() => handleReprocessSingle(item)}
  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
  title="Re-extrair mecanicamente com headers stealth"
  >
  <ArrowsClockwise className="h-3 w-3" />
  Reprocessar
  </button>
  )}
  </div>
  </td>
  </tr>
  ))
  )}
  </tbody>
  </table>
  </div>
  </div>
  )}

  {/* ══════════════════════════════════════════════════════════════════
  ABA 3: Mineração de Eventos Externos & RSVP
  ══════════════════════════════════════════════════════════════════ */}
  {activeTab === "events" && (
  <div className="space-y-5">
  {/* Form de Mineração de Eventos */}
  <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
  <div className="flex items-center gap-2">
  <Ticket className="h-5 w-5 text-primary" />
  <div>
  <h2 className="text-base font-bold text-foreground">Minerar & Indexar Eventos Externos</h2>
  <p className="text-xs text-muted-foreground">
  Extraia eventos do Sympla, Eventbrite ou portais municipais com dados completos de ingressos, local e cobertura jornalística.
  </p>
  </div>
  </div>

  <form onSubmit={handleMineExternalEvent} className="flex flex-col sm:flex-row gap-3">
  <input
  type="url"
  placeholder="Cole a URL do evento (ex: https://www.sympla.com.br/evento/...)"
  value={eventInputUrl}
  onChange={(e) => setEventInputUrl(e.target.value)}
  required
  className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
  />
  <button
  type="submit"
  disabled={isMiningEvent || !eventInputUrl}
  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shrink-0"
  >
  {isMiningEvent ? (
  <>
  <SpinnerGap className="h-4 w-4 animate-spin" />
  Minerando & Redigindo Matéria...
  </>
  ) : (
  <>
  <Ticket className="h-4 w-4" />
  Extrair Evento & Gerar Cobertura
  </>
  )}
  </button>
  </form>
  </div>

  {/* Lista de Eventos Indexados */}
  <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
  <div className="flex items-center justify-between">
  <div>
  <h3 className="text-base font-bold text-foreground">Eventos Ativos na Região (Chapecó/SC)</h3>
  <p className="text-xs text-muted-foreground">{eventsList.length} eventos indexados no sistema</p>
  </div>
  </div>

  {eventsList.length === 0 ? (
  <div className="py-12 text-center text-muted-foreground">
  <Ticket className="mx-auto h-8 w-8 opacity-40 mb-2" />
  <p className="text-sm font-medium">Nenhum evento externo minerado ainda.</p>
  <p className="text-xs">Cole uma URL do Sympla ou portal de eventos acima para indexar.</p>
  </div>
  ) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {eventsList.map((ev: any) => (
  <div key={ev.id} className="rounded-xl border border-border bg-card/60 p-4 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-colors">
  <div className="space-y-2">
  {ev.cover_image_url && (
  <div className="h-32 w-full rounded-lg overflow-hidden bg-muted">
  <img src={ev.cover_image_url} alt={ev.title} className="h-full w-full object-cover" />
  </div>
  )}
  <div className="flex items-center gap-2">
  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
  {ev.is_external ? "Divulgação Externa" : "Evento Oficial"}
  </span>
  {ev.city && (
  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
  <MapPin className="h-3 w-3" />
  {ev.city}
  </span>
  )}
  </div>
  <h4 className="text-sm font-bold text-foreground line-clamp-2">{ev.title}</h4>
  {ev.venue && (
  <p className="text-xs text-muted-foreground flex items-center gap-1">
  <Buildings className="h-3.5 w-3.5 shrink-0" />
  <span className="truncate">{ev.venue}</span>
  </p>
  )}
  {ev.start_date && (
  <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
  <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
  {new Date(ev.start_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
  </p>
  )}
  </div>

  {/* RSVP Mensuração e Link de Ingresso */}
  <div className="border-t border-border/60 pt-3 space-y-2">
  <div className="flex items-center justify-between text-xs">
  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
  <Users className="h-3.5 w-3.5" /> RSVP:
  </span>
  <div className="flex items-center gap-2 font-mono text-[11px]">
  <span className="text-emerald-500 font-bold" title="Confirmados">{ev.rsvp_going_count || 0} vou</span>
  <span>·</span>
  <span className="text-blue-400 font-bold" title="Interessados">{ev.rsvp_interested_count || 0} interesse</span>
  <span>·</span>
  <span className="text-muted-foreground" title="Não vão">{ev.rsvp_not_going_count || 0} não vou</span>
  </div>
  </div>

  <div className="flex items-center gap-2 pt-1">
  {ev.external_url && (
  <a
  href={ev.external_url}
  target="_blank"
  rel="noopener noreferrer"
  className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary/10 border border-primary/20 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
  >
  <ArrowSquareOut className="h-3.5 w-3.5" />
  Comprar Ingresso / Site Oficial
  </a>
  )}
  {ev.news_coverage_id && (
  <span className="rounded-lg bg-muted px-2 py-1.5 text-[11px] font-semibold text-muted-foreground flex items-center gap-1" title="Matéria de cobertura vinculada">
  <FileText className="h-3.5 w-3.5 text-primary" />
  Notícia
  </span>
  )}
  </div>
  </div>
  </div>
  ))}
  </div>
  )}
  </div>
  </div>
  )}

  {/* MODAL STUDIO MACHINE ESCAMAS */}
  {studioProject && (
    <CarouselStudioEditor
      project={studioProject}
      isOpen={!!studioProject}
      onClose={() => setStudioProject(null)}
      onProjectUpdated={(up) => setStudioProject(up)}
    />
  )}

    {/* ══════════════════════════════════════════════════════════════════
    ABA 5: Mineração de Vagas & Empregos com Links Oficiais
    ══════════════════════════════════════════════════════════════════ */}
    {activeTab === "jobs" && (
      <div className="space-y-6">
        {/* Box de Mineração de Vagas */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Minerar & Publicar Vaga Externa</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cadastre vagas de portais regionais, SINE ou empresas com link oficial de candidatura.
              </p>
            </div>
            <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {jobsList.length} Vagas Ativas
            </span>
          </div>

          <form onSubmit={handlePublishExternalJob} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Título da Vaga</label>
                <input
                  placeholder="Ex: Desenvolvedor Fullstack Sênior"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Empresa Contratante</label>
                <input
                  placeholder="Ex: Aurora Coop / Unimed"
                  value={jobCompany}
                  onChange={(e) => setJobCompany(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Categoria</label>
                <select
                  value={jobCategory}
                  onChange={(e) => setJobCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="clt">CLT</option>
                  <option value="pj">PJ</option>
                  <option value="estagio">Estágio</option>
                  <option value="tech">Tecnologia & Dev</option>
                  <option value="comercial">Comercial & Vendas</option>
                  <option value="operacional">Operacional</option>
                  <option value="saude">Saúde & Cuidados</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Localização</label>
                <input
                  placeholder="Ex: Chapecó, SC"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Remuneração / Salário</label>
                <input
                  placeholder="Ex: R$ 4.500 ou A combinar"
                  value={jobSalary}
                  onChange={(e) => setJobSalary(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Fonte / Portal</label>
                <input
                  placeholder="Ex: SINE Chapecó / LinkedIn"
                  value={jobSource}
                  onChange={(e) => setJobSource(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">URL Oficial de Candidatura</label>
                <input
                  type="url"
                  placeholder="https://gupy.io/vaga/... ou https://..."
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  required
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Descrição Breve / Requisitos</label>
                <input
                  placeholder="Ex: Requisitos principais, benefícios e contato..."
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isMiningJob}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              {isMiningJob ? <SpinnerGap className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
              Minerar & Publicar Vaga
            </button>
          </form>
        </div>

        {/* Tabela de Vagas Mineradas */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-bold text-foreground mb-4">Vagas Externas Ativas no Ecossistema</h3>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border text-muted-foreground uppercase">
                <tr>
                  <th className="py-2.5 pr-4 font-bold">Vaga & Empresa</th>
                  <th className="py-2.5 pr-4 font-bold">Categoria & Local</th>
                  <th className="py-2.5 pr-4 font-bold">Salário</th>
                  <th className="py-2.5 pr-4 font-bold">Fonte</th>
                  <th className="py-2.5 font-bold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {jobsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      Nenhuma vaga externa minerada no momento. Utilize o formulário acima para cadastrar.
                    </td>
                  </tr>
                ) : (
                  jobsList.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="font-bold text-foreground">{job.title}</div>
                        <div className="text-[11px] text-muted-foreground">{job.company_name}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-mono text-primary font-semibold uppercase">{job.category}</span>
                        <div className="text-[11px] text-muted-foreground">{job.location}</div>
                      </td>
                      <td className="py-3 pr-4 font-mono font-bold text-foreground">
                        {job.salary_display}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {job.external_source || "Oficial"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {job.external_url ? (
                            <a
                              href={job.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                            >
                              <ArrowSquareOut className="h-3.5 w-3.5" />
                              Link Oficial
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Interna</span>
                          )}
                          <button
                            onClick={() => handleGenerateCarousel("empregos", job)}
                            disabled={isGeneratingCarousel}
                            className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-all"
                            title="Gerar Carrossel de Vaga para Instagram"
                          >
                            <Sparkle className="h-3 w-3" />
                            Carrossel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

  {/* ══════════════════════════════════════════════════════════════════
  ABA 4: Editais Municipais & PNCP
  ══════════════════════════════════════════════════════════════════ */}
  {activeTab === "pncp" && (
  <div className="space-y-5">
  <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
  <div>
  <h2 className="text-base font-bold text-foreground">Portal Nacional de Contratações Públicas (PNCP)</h2>
  <p className="text-xs text-muted-foreground">
  Extração oficial de compras públicas, licitações e editais de Chapecó e região com indexação cívica.
  </p>
  </div>
  <button
  onClick={handleSyncPncpContracts}
  disabled={isSyncingPncp}
  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
  >
  {isSyncingPncp ? (
  <SpinnerGap className="h-4 w-4 animate-spin" />
  ) : (
  <ArrowsClockwise className="h-4 w-4" />
  )}
  Sincronizar Editais Oficiais (Chapecó/SC)
  </button>
  </div>
  </div>

  {/* Tabela de Editais */}
  <div className="rounded-2xl border border-border bg-card p-6">
  <div className="overflow-x-auto no-scrollbar">
  <table className="w-full text-left text-xs">
  <thead className="border-b border-border text-muted-foreground uppercase">
  <tr>
  <th className="py-2.5 pr-4 font-bold">Órgão Comprador</th>
  <th className="py-2.5 pr-4 font-bold">Objeto / Licitação</th>
  <th className="py-2.5 pr-4 font-bold">Valor Estimado</th>
  <th className="py-2.5 pr-4 font-bold">Data</th>
  <th className="py-2.5 font-bold">Ação</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-border/60">
  {pncpList.length === 0 ? (
  <tr>
  <td colSpan={5} className="py-12 text-center text-muted-foreground">
  Nenhum edital carregado na sessão. Clique em "Sincronizar Editais Oficiais" para buscar da API do PNCP.
  </td>
  </tr>
  ) : (
  pncpList.map((item: any, idx: number) => {
  const valor = item.valorTotalEstimado
  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.valorTotalEstimado)
  : "Sigiloso / Não informado";
  return (
  <tr key={item.numeroControlePNCP || idx} className="hover:bg-muted/30 transition-colors">
  <td className="py-3 pr-4">
  <div className="font-semibold text-foreground">
  {item.orgaoEntidade?.razaoSocial || item.unidadeOrgao?.municipioNome || "Município de Chapecó"}
  </div>
  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
  <span className="text-[11px] text-muted-foreground font-mono">
  {item.numeroControlePNCP}
  </span>
  {item.modalidadeNome && (
  <Badge
  variant="outline"
  className={cn(
  "text-[10px] px-1.5 py-0 font-medium rounded-md",
  item.modalidadeNome.toLowerCase().includes("pregão")
  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
  : item.modalidadeNome.toLowerCase().includes("dispensa") || item.modalidadeNome.toLowerCase().includes("inexigibilidade")
  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
  : item.modalidadeNome.toLowerCase().includes("concorrência") || item.modalidadeNome.toLowerCase().includes("tomada")
  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  )}
  >
  {item.modalidadeNome}
  </Badge>
  )}
  </div>
  </td>
  <td className="py-3 pr-4 max-w-md">
  <div className="font-medium text-foreground line-clamp-2">
  {item.objetoContratacao || "Contratação pública"}
  </div>
  </td>
  <td className="py-3 pr-4 font-mono font-bold text-foreground">
  {valor}
  </td>
  <td className="py-3 pr-4 font-mono text-muted-foreground">
  {item.dataPublicacaoPncp ? new Date(item.dataPublicacaoPncp).toLocaleDateString("pt-BR") : "—"}
  </td>
  <td className="py-3">
    <div className="flex items-center gap-2">
      <a
        href={`https://pncp.gov.br/app/editais/${item.numeroControlePNCP}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
      >
        <ArrowSquareOut className="h-3.5 w-3.5" />
        PNCP Oficial
      </a>
      <button
        onClick={() => handleCreateNewsFromPncp(item)}
        disabled={convertingPncpId === item.numeroControlePNCP}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
        title="Transformar edital em pauta jornalística com 1 clique"
      >
        {convertingPncpId === item.numeroControlePNCP ? (
          <SpinnerGap className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Article className="h-3.5 w-3.5" />
        )}
        Gerar Pauta
      </button>
      <button
        onClick={() => handleGenerateCarousel("licitacoes", item)}
        disabled={isGeneratingCarousel}
        className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-all disabled:opacity-50"
        title="Gerar Carrossel para Redes Sociais"
      >
        <Sparkle className="h-3.5 w-3.5" />
        Carrossel Studio
      </button>
    </div>
  </td>
  </tr>
  );
  })
  )}
  </tbody>
  </table>
  </div>
  </div>
  </div>
  )}

 {/* ══════════════════════════════════════════════════════════════════
 ABA 3: Feeds RSS
 ══════════════════════════════════════════════════════════════════ */}
 {activeTab === "feeds" && (
 <div className="space-y-5">
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
 {feeds.map((feed: any) => (
 <div key={feed.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0">
 <h3 className="text-sm font-bold text-foreground truncate">{feed.name}</h3>
 <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">{feed.feed_url}</p>
 </div>
 <button
 onClick={() => handleToggleFeed(feed.id, feed.is_active)}
 className="shrink-0 mt-0.5"
 title={feed.is_active ? "Desativar feed" : "Ativar feed"}
 >
 {feed.is_active
 ? <ToggleRight className="h-6 w-6 text-emerald-500" />
 : <ToggleLeft className="h-6 w-6 text-muted-foreground" />
 }
 </button>
 </div>

 <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-t border-border pt-2.5">
 <span className="font-mono">{feed.items_count || 0} itens</span>
 <span>·</span>
 <span className="font-mono">{feed.items_published_count || 0} publicados</span>
 {feed.last_success_at && (
 <>
 <span>·</span>
 <span>
 {new Date(feed.last_success_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
 </span>
 </>
 )}
 </div>

 <button
 id={`btn-fetch-rss-${feed.id}`}
 onClick={() => handleFetchRss(feed.id)}
 disabled={fetchingFeedId === feed.id || !feed.is_active}
 className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 py-2 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-all"
 >
 {fetchingFeedId === feed.id
 ? <SpinnerGap className="h-3.5 w-3.5 animate-spin" />
 : <Broadcast className="h-3.5 w-3.5" />
 }
 {fetchingFeedId === feed.id ? "Buscando..." : "Fetch Agora"}
 </button>
 </div>
 ))}
 </div>

 {/* Form novo feed */}
 <div className="rounded-2xl border border-border bg-card p-5">
 <h3 className="text-sm font-bold text-foreground mb-4">Cadastrar Novo Feed RSS</h3>
 <form onSubmit={handleAddFeed} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <input
 type="text"
 placeholder="Nome (ex: G1 Chapecó)"
 value={feedName}
 onChange={(e) => setFeedName(e.target.value)}
 required
 className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
 />
 <input
 type="url"
 placeholder="URL do Feed XML"
 value={feedUrl}
 onChange={(e) => setFeedUrl(e.target.value)}
 required
 className="rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
 />
 <button
 type="submit"
 disabled={isPending}
 className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
 >
 {isPending ? "Cadastrando..." : "Cadastrar Feed"}
 </button>
 </form>
 </div>
 </div>
 )}

 {/* ══════════════════════════════════════════════════════════════════
 ABA 4: Scrapers por Domínio
 ══════════════════════════════════════════════════════════════════ */}
 {activeTab === "scrapers" && (
 <div className="rounded-2xl border border-border bg-card p-6">
 <div className="mb-4 flex items-center justify-between">
 <h2 className="text-base font-bold text-foreground">Configurações de Scraper por Domínio</h2>
 <span className="text-xs text-muted-foreground">{scrapers.filter((s) => !s.is_blocked).length} ativos · {scrapers.filter((s) => s.is_blocked).length} bloqueados</span>
 </div>

 <div className="overflow-x-auto no-scrollbar">
 <table className="w-full text-left text-xs">
 <thead className="border-b border-border text-muted-foreground uppercase">
 <tr>
 <th className="py-2.5 pr-4 font-bold">Domínio</th>
 <th className="py-2.5 pr-4 font-bold">Credibilidade</th>
 <th className="py-2.5 pr-4 font-bold">Confiabilidade</th>
 <th className="py-2.5 pr-4 font-bold">Scraped / Publicados</th>
 <th className="py-2.5 font-bold">Status</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/60">
 {scrapers.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-10 text-center text-muted-foreground">
 Nenhum scraper configurado. As configurações são criadas automaticamente na primeira extração.
 </td>
 </tr>
 ) : (
 scrapers.map((sc) => (
 <tr key={sc.id} className="hover:bg-muted/30 transition-colors">
 <td className="py-3 pr-4">
 <div className="font-semibold text-foreground">{sc.label}</div>
 <div className="font-mono text-[11px] text-muted-foreground">{sc.domain}</div>
 </td>
 <td className="py-3 pr-4">
 <span className={`font-semibold capitalize ${
 sc.source_credibility === "high" ? "text-emerald-500" :
 sc.source_credibility === "medium" ? "text-amber-500" : "text-red-400"
 }`}>
 {sc.source_credibility}
 </span>
 </td>
 <td className="py-3 pr-4">
 <div className="flex items-center gap-1.5">
 <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
 <div
 className="h-full rounded-full bg-primary"
 style={{ width: `${sc.reliability_score}%` }}
 />
 </div>
 <span className="font-mono text-foreground">{sc.reliability_score}%</span>
 </div>
 </td>
 <td className="py-3 pr-4 font-mono">
 {sc.total_scraped} / {sc.total_published}
 </td>
 <td className="py-3">
 {sc.is_blocked
 ? <span className="rounded-lg bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive flex items-center gap-1">
 <Shield className="h-3 w-3" />
 Bloqueado
 </span>
 : <span className="rounded-lg bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Ativo</span>
 }
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* ══════════════════════════════════════════════════════════════════
 ABA 5: Importar URL com IA
 ══════════════════════════════════════════════════════════════════ */}
 {activeTab === "import" && (
 <div className="max-w-2xl">
 <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
 <div className="flex items-center gap-2">
 <Lightning className="h-5 w-5 text-primary" />
 <h2 className="text-base font-bold text-foreground">Importar & Estruturar com IA</h2>
 </div>

 <div className="rounded-xl bg-primary/5 border border-primary/20 p-3.5 text-xs text-muted-foreground space-y-1">
 <p className="font-semibold text-foreground">Como funciona:</p>
 <ol className="list-decimal list-inside space-y-1">
 <li>Cole a URL de qualquer artigo, notícia ou blog post</li>
 <li>Firecrawl extrai o conteúdo limpo (ou fallback HTTP)</li>
 <li>Gemini/Groq estrutura o conteúdo editorialmente</li>
 <li>O artigo vai para "Artigos Minerados" aguardando curadoria</li>
 </ol>
 </div>

 <form onSubmit={handleImportUrl} className="space-y-4">
 <div>
 <label htmlFor="import-url" className="text-xs font-bold text-foreground block mb-1.5">URL do Conteúdo</label>
 <input
 id="import-url"
 type="url"
 placeholder="https://g1.globo.com/santa-catarina/..."
 value={importUrl}
 onChange={(e) => setImportUrl(e.target.value)}
 required
 className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-bold text-foreground block mb-1.5">Tom Editorial</label>
 <select
 value={importTone}
 onChange={(e) => setImportTone(e.target.value as any)}
 className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
 >
 <option value="editorial">Editorial (Jornalístico)</option>
 <option value="profissional">Profissional</option>
 <option value="imparcial">Imparcial / Factual</option>
 </select>
 </div>
 <div>
 <label className="text-xs font-bold text-foreground block mb-1.5">Tipo de Conteúdo</label>
 <select
 value={importContentType}
 onChange={(e) => setImportContentType(e.target.value as any)}
 className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
 >
 <option value="news">Notícia / Artigo</option>
 <option value="blog_post">Blog Post</option>
 <option value="recipe">Receita</option>
 </select>
 </div>
 </div>

 <button
 type="submit"
 disabled={isImporting || !importUrl}
 id="btn-import-url-ai"
 className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
 >
 {isImporting ? (
 <>
 <SpinnerGap className="h-4 w-4 animate-spin" />
 Extraindo e estruturando com IA...
 </>
 ) : (
 <>
 <Robot className="h-4 w-4" />
 Importar & Estruturar com IA
 <ArrowRight className="h-4 w-4" />
 </>
 )}
 </button>
 </form>
 </div>
 </div>
 )}

 </div>
 </div>
 );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({
 icon,
 label,
 value,
 accent,
}: {
 icon: React.ReactNode;
 label: string;
 value: string | number;
 accent?: "amber" | "green" | "red";
}) {
 return (
 <div className="rounded-2xl border border-border bg-card p-3.5">
 <div className="flex items-center justify-between text-muted-foreground mb-2">
 <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
 {icon}
 </div>
 <div className={`text-xl font-bold ${
 accent === "amber" ? "text-amber-500" :
 accent === "green" ? "text-emerald-500" :
 accent === "red" ? "text-red-400" : "text-foreground"
 }`}>
 {value}
 </div>
 </div>
 );
}
