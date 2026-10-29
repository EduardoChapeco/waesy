import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition, useMemo } from "react";
import {
  Newspaper,
  Plus,
  Eye,
  Trash2,
  Clock,
  Radio,
  Inbox,
  User,
  Phone,
  Megaphone,
  Star,
  CalendarClock,
  Instagram,
  Lock,
  Layers,
  Shuffle,
  CheckCircle2,
  Loader2,
  CheckSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateCarouselFromMinedContent } from "@/services/studio.functions";
import { CarouselStudioEditor } from "@/components/studio/carousel-studio-editor";
import type { EscamasCarouselProject } from "@/types/studio-machine";
import {
  listWorkspaceArticles,
  deleteArticle,
  listCommunityNewsTips,
  type NewsArticleDTO,
  listEditorialSocialSchedulesFn,
  getEditorialSocialSettingsFn,
  updateEditorialSocialSettingsFn,
  scheduleEditorialSocialPostFn,
  type EditorialSocialScheduleDTO,
  type EditorialSocialSettingsDTO,
} from "@/services/news.functions";
import {
  listMinedArticles,
  curateMineArticle,
  batchCurateMineArticlesFn,
  type MinedArticleDTO,
} from "@/services/mining.functions";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { EmptyState } from "@/components/state/states";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { AiCurationUpgradeModal } from "@/components/commerce/ai-curation-upgrade-modal";
import { ImageUpload } from "@/components/ui/image-upload";

export const Route = createFileRoute("/workspace/noticias/")({
  head: () => ({ meta: [{ title: "Notícias & Automação Editorial | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [articles, tips, mined, schedules, socialSettings] = await Promise.all([
        listWorkspaceArticles().catch(() => []),
        listCommunityNewsTips().catch(() => []),
        listMinedArticles({ data: { limit: 20, status: "pending_review" } }).catch(() => ({ items: [], total: 0 })),
        listEditorialSocialSchedulesFn({ data: {} }).catch(() => []),
        getEditorialSocialSettingsFn({ data: {} }).catch(() => null),
      ]);
      return {
        articles: Array.isArray(articles) ? articles : [],
        tips: Array.isArray(tips) ? tips : [],
        mined: Array.isArray(mined?.items) ? mined.items : [],
        schedules: Array.isArray(schedules) ? schedules : [],
        socialSettings: socialSettings || null,
      };
    } catch (err) {
      console.error("[loader:workspace.noticias.index] Unhandled loader error:", err);
      return { articles: [], tips: [], mined: [], schedules: [], socialSettings: null };
    }
  },
  component: WorkspaceNoticiasIndexPage,
});

function WorkspaceNoticiasIndexPage() {
  const rawLoaderData = (Route.useLoaderData?.() as any) || {};
  const initialArticles = Array.isArray(rawLoaderData.articles) ? rawLoaderData.articles : [];
  const initialMined = Array.isArray(rawLoaderData.mined) ? rawLoaderData.mined : [];
  const initialTips = Array.isArray(rawLoaderData.tips) ? rawLoaderData.tips : [];
  const initialSchedules = Array.isArray(rawLoaderData.schedules) ? rawLoaderData.schedules : [];
  const initialSettings = (rawLoaderData.socialSettings as EditorialSocialSettingsDTO) || {
    store_id: "",
    auto_publish_stories_enabled: false,
    auto_publish_feed_enabled: false,
    daily_stories_time: "08:00",
    fixed_ending_slide_url: null,
    random_layouts_enabled: true,
  };

  const [articles, setArticles] = useState<NewsArticleDTO[]>(initialArticles);
  const [minedArticles, setMinedArticles] = useState<MinedArticleDTO[]>(initialMined);
  const [tips, setTips] = useState<any[]>(initialTips);
  const [schedules, setSchedules] = useState<EditorialSocialScheduleDTO[]>(initialSchedules);
  const [settings, setSettings] = useState<EditorialSocialSettingsDTO>(initialSettings);

  const [activeTab, setActiveTab] = useState("materias");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [, startTransition] = useTransition();
  const [selectedMinedIds, setSelectedMinedIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Agendador Rápido
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [targetArticleId, setTargetArticleId] = useState<string>("");
  const [scheduleChannel, setScheduleChannel] = useState<"instagram_feed" | "instagram_stories">("instagram_feed");
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [scheduleCaption, setScheduleCaption] = useState<string>("");
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Studio Machine Carrossel
  const [studioProject, setStudioProject] = useState<EscamasCarouselProject | null>(null);

  const refreshArticles = async () => {
    const updated = await listWorkspaceArticles().catch(() => []);
    setArticles(updated);
  };

  const refreshSchedules = async () => {
    const updated = await listEditorialSocialSchedulesFn({ data: {} }).catch(() => []);
    setSchedules(updated);
  };

  const filteredArticles = useMemo(() => {
    if (stageFilter === "all") return articles;
    if (stageFilter === "members_only") return articles.filter((a) => a.is_members_only);
    return articles.filter((a) => a.editorial_stage === stageFilter || a.status === stageFilter);
  }, [articles, stageFilter]);

  const totalViews = useMemo(() => {
    return articles.reduce((acc, a) => acc + (a.views_count || 0), 0);
  }, [articles]);

  const scheduledCount = useMemo(() => {
    return schedules.filter((s) => s.status === "scheduled").length;
  }, [schedules]);

  const handleDelete = async (id: string) => {
    try {
      await deleteArticle({ data: { id } });
      toast.success("Matéria removida com sucesso.");
      await refreshArticles();
    } catch {
      toast.error("Erro ao remover matéria.");
    }
  };

  const toggleSelectMined = (id: string) => {
    setSelectedMinedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllMined = () => {
    if (selectedMinedIds.length === minedArticles.length) {
      setSelectedMinedIds([]);
    } else {
      setSelectedMinedIds(minedArticles.map((m) => m.id));
    }
  };

  const handleBatchCurate = async (action: "approve" | "reject") => {
    if (selectedMinedIds.length === 0) return;
    setIsBatchProcessing(true);
    try {
      const res = await batchCurateMineArticlesFn({
        data: {
          mined_article_ids: selectedMinedIds,
          action,
        },
      });

      if (action === "approve") {
        toast.success(`${res.processed} notícia(s) aprovada(s) e publicadas no portal!`);
        await refreshArticles();
      } else {
        toast.success(`${res.processed} notícia(s) rejeitada(s).`);
      }

      setMinedArticles((prev) => prev.filter((m) => !selectedMinedIds.includes(m.id)));
      setSelectedMinedIds([]);
    } catch (err: any) {
      toast.error(err?.message || "Erro na curadoria em lote");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleApproveMined = (mined: MinedArticleDTO) => {
    startTransition(async () => {
      try {
        await curateMineArticle({
          data: {
            mined_article_id: mined.id,
            action: "approve",
          },
        });
        toast.success("Notícia aprovada e publicada no portal!");
        setMinedArticles((prev) => prev.filter((m) => m.id !== mined.id));
        await refreshArticles();
      } catch (err: any) {
        toast.error(err?.message || "Erro ao aprovar matéria.");
      }
    });
  };

  const handleRejectMined = (minedId: string) => {
    startTransition(async () => {
      try {
        await curateMineArticle({
          data: {
            mined_article_id: minedId,
            action: "reject",
            curator_notes: "Rejeitado na curadoria do workspace",
          },
        });
        toast.success("Notícia minerada descartada.");
        setMinedArticles((prev) => prev.filter((m) => m.id !== minedId));
      } catch (err: any) {
        toast.error(err?.message || "Erro ao rejeitar matéria.");
      }
    });
  };

  const handleGenerateCarouselFromArticle = async (art: NewsArticleDTO) => {
    try {
      const res = await generateCarouselFromMinedContent({
        data: {
          contentType: "noticias",
          itemId: art.id,
          title: art.title,
          summary: art.subtitle || "",
          coverUrl: art.cover_media_url || null,
          details: { category: art.category },
        },
      });
      setStudioProject(res.project);
      toast.success("Carrossel gerado no Studio Machine!");
    } catch (err: any) {
      toast.error("Erro ao gerar carrossel: " + (err.message || "Tente novamente."));
    }
  };

  const handleSaveSocialSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const saved = await updateEditorialSocialSettingsFn({
        data: {
          instagramAccountHandle: settings.instagram_account_handle || undefined,
          autoPublishStoriesEnabled: settings.auto_publish_stories_enabled,
          autoPublishFeedEnabled: settings.auto_publish_feed_enabled,
          dailyStoriesTime: settings.daily_stories_time,
          fixedEndingSlideUrl: settings.fixed_ending_slide_url || undefined,
          randomLayoutsEnabled: settings.random_layouts_enabled,
        },
      });
      setSettings(saved);
      toast.success("Configurações sociais salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar configurações sociais: " + (err.message || "Tente novamente."));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleOpenScheduleModal = (article?: NewsArticleDTO) => {
    const art = article || articles[0];
    if (art) {
      setTargetArticleId(art.id);
      setScheduleCaption(`${art.title}\n\nConfira os detalhes desta notícia no portal oficial.\n\n#noticias #jornalismo #${art.category.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
    }
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 2);
    setScheduleTime(defaultDate.toISOString().slice(0, 16));
    setIsScheduleModalOpen(true);
  };

  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetArticleId) {
      toast.error("Selecione uma matéria para agendar.");
      return;
    }
    setIsSubmittingSchedule(true);
    try {
      await scheduleEditorialSocialPostFn({
        data: {
          articleId: targetArticleId,
          channel: scheduleChannel,
          scheduledFor: scheduleTime || new Date().toISOString(),
          captionText: scheduleCaption,
          autoPostMode: "daily_scheduled",
          fixedEndingSlideUrl: settings.fixed_ending_slide_url || undefined,
          layoutVariant: settings.random_layouts_enabled ? "random" : "classic_card",
        },
      });
      toast.success("Publicação agendada com sucesso!");
      setIsScheduleModalOpen(false);
      await refreshSchedules();
    } catch (err: any) {
      toast.error("Erro ao agendar publicação: " + (err.message || "Tente novamente."));
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  return (
    <div className="w-full space-y-6 motion-reduce:transition-none">
      {/* Cabeçalho */}
      <PageHeader
        title="Notícias & Redação"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold gap-2 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Configurar Chave IA"
            >
              <Star className="size-4 text-primary" />
              <span>Curadoria IA</span>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11 min-h-11 px-3 rounded-xl font-bold text-xs gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Link to="/workspace/marketing/patrocinadores">
                <Megaphone className="size-4" />
                <span>Ad Server</span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenScheduleModal()}
              className="h-11 min-h-11 px-3 rounded-xl font-bold text-xs gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Instagram className="size-4" />
              <span>Agendar Post</span>
            </Button>
            <Button asChild size="sm" className="h-11 min-h-11 px-4 rounded-xl font-bold gap-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Link to="/workspace/noticias/novo">
                <Plus className="size-4" />
                <span>Nova Matéria</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* Faixa de Métricas Editoriais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matérias Totais</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-foreground">{articles.length}</span>
            <Newspaper className="size-4 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leituras Registradas</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-foreground">{totalViews.toLocaleString("pt-BR")}</span>
            <Eye className="size-4 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fila Social Instagram</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-foreground">{scheduledCount}</span>
            <CalendarClock className="size-4 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pautas Cidadãs</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-foreground">{tips.length}</span>
            <Inbox className="size-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Abas Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-11 w-full max-w-2xl p-1 bg-muted/40 rounded-2xl">
          <TabsTrigger value="materias" className="h-9 min-h-11 rounded-xl text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Newspaper className="size-4 shrink-0" />
            <span className="truncate">Matérias ({articles.length})</span>
          </TabsTrigger>
          <TabsTrigger value="mineradas" className="h-9 min-h-11 rounded-xl text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Radio className="size-4 shrink-0" />
            <span className="truncate">Curadoria IA ({minedArticles.length})</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="h-9 min-h-11 rounded-xl text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Instagram className="size-4 shrink-0" />
            <span className="truncate">Instagram & Fila ({schedules.length})</span>
          </TabsTrigger>
          <TabsTrigger value="pautas" className="h-9 min-h-11 rounded-xl text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Inbox className="size-4 shrink-0" />
            <span className="truncate">Pautas ({tips.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Aba 1: Matérias & Workflow Editorial ── */}
        <TabsContent value="materias" className="space-y-4">
          {/* Filtros por Estágio e Paywall */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setStageFilter("all")}
              className={`h-11 min-h-11 px-4 rounded-xl text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                stageFilter === "all" ? "bg-foreground text-background" : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              Todas ({articles.length})
            </button>
            <button
              type="button"
              onClick={() => setStageFilter("publicado")}
              className={`h-11 min-h-11 px-4 rounded-xl text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                stageFilter === "publicado" ? "bg-foreground text-background" : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              Publicadas
            </button>
            <button
              type="button"
              onClick={() => setStageFilter("em_apuracao")}
              className={`h-11 min-h-11 px-4 rounded-xl text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                stageFilter === "em_apuracao" ? "bg-foreground text-background" : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              Em Apuração
            </button>
            <button
              type="button"
              onClick={() => setStageFilter("apurado")}
              className={`h-11 min-h-11 px-4 rounded-xl text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                stageFilter === "apurado" ? "bg-foreground text-background" : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              Apuradas
            </button>
            <button
              type="button"
              onClick={() => setStageFilter("members_only")}
              className={`h-11 min-h-11 px-4 rounded-xl text-xs font-semibold transition-colors duration-200 inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                stageFilter === "members_only" ? "bg-foreground text-background" : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              <Lock className="size-4" />
              <span>Assinantes</span>
            </button>
          </div>

          {filteredArticles.length === 0 ? (
            <EmptyState
              title="Nenhuma matéria encontrada"
              description="Ajuste os filtros de estágio ou crie uma nova reportagem para publicar no portal."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredArticles.map((art) => (
                <div
                  key={art.id}
                  className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {art.cover_media_url ? (
                      <div className="size-16 rounded-xl overflow-hidden bg-muted shrink-0">
                        <img
                          src={art.cover_media_url}
                          alt={art.title}
                          className="size-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="size-16 rounded-xl border border-border bg-muted/40 flex items-center justify-center shrink-0 text-muted-foreground">
                        <Newspaper className="size-6" />
                      </div>
                    )}

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs uppercase font-mono">
                          {art.category}
                        </Badge>
                        <Badge
                          variant={art.status === "published" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {art.editorial_stage === "em_apuracao"
                            ? "Em Apuração"
                            : art.editorial_stage === "apurado"
                              ? "Apurado"
                              : art.status === "published"
                                ? "Publicado"
                                : "Rascunho"}
                        </Badge>
                        {art.is_members_only && (
                          <Badge variant="outline" className="text-xs border-amber-500/50 text-foreground inline-flex items-center gap-1">
                            <Lock className="size-3 text-amber-500" />
                            <span>Assinantes</span>
                          </Badge>
                        )}
                        {art.city && (
                          <span className="text-xs text-muted-foreground font-medium">
                            · {art.city}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-1">
                        {art.title}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Eye className="size-3.5" />
                          {art.views_count || 0} views
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="size-3.5" />
                          {art.reading_time_minutes || 3} min
                        </span>
                        <span>•</span>
                        <span>Fonte: {art.source_credibility || "Redação"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenScheduleModal(art)}
                      className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Instagram className="size-4 text-primary" />
                      <span>Agendar</span>
                    </Button>

                    <CrudActionsMenu
                      entityName="Matéria"
                      viewUrl={`/noticias/${art.slug}`}
                      customActions={[
                        {
                          label: "Gerar Carrossel (Studio)",
                          icon: Star,
                          onClick: () => handleGenerateCarouselFromArticle(art),
                        },
                      ]}
                      onDelete={() => handleDelete(art.id)}
                      deleteConfirmTitle="Excluir Notícia?"
                      deleteConfirmDescription={`Deseja realmente excluir "${art.title}"? Esta ação removerá a publicação do portal.`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Aba 2: Curadoria & Mineração IA ── */}
        <TabsContent value="mineradas" className="space-y-4">
          {minedArticles.length === 0 ? (
            <EmptyState
              title="Nenhuma notícia minerada pendente de curadoria"
              description="Quando novos fatos regionais forem coletados automaticamente pelos mineradores, eles aparecerão aqui para validação e publicação."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllMined}
                    className="h-11 min-h-11 px-3 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {selectedMinedIds.length === minedArticles.length ? "Desmarcar Todos" : "Selecionar Todos"}
                  </button>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {selectedMinedIds.length} selecionado(s)
                  </span>
                </div>

                {selectedMinedIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={isBatchProcessing}
                      onClick={() => handleBatchCurate("approve")}
                      className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {isBatchProcessing ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      <span>Aprovar & Publicar ({selectedMinedIds.length})</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBatchProcessing}
                      onClick={() => handleBatchCurate("reject")}
                      className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {minedArticles.map((m) => {
                  const isSelected = selectedMinedIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-2xl border transition-colors duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleSelectMined(m.id)}
                          className={`size-11 min-h-11 rounded-md border flex items-center justify-center shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border bg-card"
                          }`}
                          aria-label="Selecionar notícia minerada"
                        >
                          {isSelected && <CheckSquare className="size-5" />}
                        </button>

                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs uppercase font-mono">
                              {m.ai_suggested_category || "Geral"}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-medium">
                              Fonte: {m.source_domain || "Web"}
                            </span>
                          </div>

                          <h4 className="text-sm sm:text-base font-bold text-foreground line-clamp-2">
                            {m.ai_structured_title || m.raw_title}
                          </h4>

                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {m.ai_structured_subtitle || m.ai_summary}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          onClick={() => handleApproveMined(m)}
                          className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <CheckCircle2 className="size-4" />
                          <span>Aprovar</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRejectMined(m.id)}
                          className="h-11 min-h-11 px-3 rounded-xl text-xs text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Aba 3: Instagram, Agendamentos & Automações Sociais ── */}
        <TabsContent value="social" className="space-y-6">
          {/* Card de Configuração das Automações Diárias */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-muted/40 text-foreground flex items-center justify-center border border-border">
                  <Instagram className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Automação de Publicações no Instagram</h3>
                  <p className="text-xs text-muted-foreground">
                    Publicação autônoma de destaques e stories diários gerados via estúdio com qualidade 300 DPI.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => handleOpenScheduleModal()}
                className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-4" />
                <span>Novo Agendamento</span>
              </Button>
            </div>

            <form onSubmit={handleSaveSocialSettings} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div className="space-y-2">
                <label htmlFor="settings-handle" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Perfil do Instagram (@perfil)
                </label>
                <input
                  id="settings-handle"
                  type="text"
                  value={settings.instagram_account_handle || ""}
                  onChange={(e) => setSettings({ ...settings, instagram_account_handle: e.target.value })}
                  placeholder="@waesynews"
                  className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Lâmina Final Fixa Padrão (Arte/Assinatura de Fechamento)
                </label>
                <ImageUpload
                  value={settings.fixed_ending_slide_url || ""}
                  onChange={(url) => setSettings({ ...settings, fixed_ending_slide_url: url })}
                  onRemove={() => setSettings({ ...settings, fixed_ending_slide_url: "" })}


                  bucket="post-media"
                  aspectPreset="portrait"
                  helperText="Envie a arte final dos stories (9:16) com sua marca e assinatura"
                  showExternalUrlOption={false}
                />
              </div>

              <div className="space-y-3 p-4 rounded-2xl border border-border bg-muted/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-bold text-foreground block">Disparo Diário de Stories</span>
                    <span className="text-xs text-muted-foreground block">
                      Publica carrossel com top notícias às {settings.daily_stories_time || "08:00"}h
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_publish_stories_enabled}
                    onChange={(e) => setSettings({ ...settings, auto_publish_stories_enabled: e.target.checked })}
                    className="size-5 rounded border border-border text-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground font-semibold">Horário do disparo:</span>
                  <input
                    type="time"
                    value={settings.daily_stories_time}
                    onChange={(e) => setSettings({ ...settings, daily_stories_time: e.target.value })}
                    className="h-11 min-h-11 rounded-xl border border-border bg-card px-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-2xl border border-border bg-muted/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-bold text-foreground block">Layouts Dinâmicos / Randômicos</span>
                    <span className="text-xs text-muted-foreground block">
                      Alterna templates visuais entre matérias para diversificar o feed social
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.random_layouts_enabled}
                    onChange={(e) => setSettings({ ...settings, random_layouts_enabled: e.target.checked })}
                    className="size-5 rounded border border-border text-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <Shuffle className="size-4 text-primary shrink-0" />
                  <span>Rotaciona entre Cartão Destaque, Citação Notável e Lâmina de Fatos.</span>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSavingSettings}
                  className="h-11 min-h-11 px-5 rounded-2xl font-bold text-xs gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSavingSettings ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  <span>Salvar Configurações Sociais</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Fila de Postagens e Histórico */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Fila de Agendamentos & Postagens Recentes</h3>
            {schedules.length === 0 ? (
              <EmptyState
                title="Nenhum agendamento social na fila"
                description="Clique em 'Novo Agendamento' ou ative o disparo diário para programar posts automáticos no Instagram."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {schedules.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-11 min-h-11 rounded-xl border border-border bg-muted/30 flex items-center justify-center shrink-0">
                        {item.channel === "instagram_stories" ? (
                          <Layers className="size-5 text-primary" />
                        ) : (
                          <Instagram className="size-5 text-primary" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                            {item.channel === "instagram_stories" ? "Stories" : "Feed"}
                          </span>
                          <Badge
                            variant={item.status === "published" ? "default" : item.status === "failed" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {item.status === "published" ? "Publicado" : item.status === "failed" ? "Falha" : "Agendado"}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-bold text-foreground line-clamp-1">
                          {item.article_title || item.caption_text || "Post Editorial"}
                        </h4>
                        <span className="text-xs text-muted-foreground font-mono">
                          Programado para: {new Date(item.scheduled_for).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {item.auto_post_mode === "daily_scheduled" ? "Disparo Diário" : "Manual"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Aba 4: Pautas da Comunidade ── */}
        <TabsContent value="pautas" className="space-y-4">
          {tips.length === 0 ? (
            <EmptyState
              title="Nenhuma sugestão de pauta pendente"
              description="Quando os leitores enviarem denúncias ou sugestões no portal Waesynews, elas aparecerão aqui para a redação analisar."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {tips.map((tip: any) => (
                <div
                  key={tip.id}
                  className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="size-4" />
                      <span className="font-bold text-foreground">{tip.author_name}</span>
                      {tip.contact_info && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="size-4" />
                            {tip.contact_info}
                          </span>
                        </>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {tip.status === "pending" ? "Pendente" : tip.status}
                    </Badge>
                  </div>

                  <p className="text-xs sm:text-sm text-foreground whitespace-pre-line leading-relaxed">
                    {tip.tip_text}
                  </p>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(tip.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <Button asChild size="sm" variant="outline" className="h-11 min-h-11 px-3 text-xs font-bold gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Link to="/workspace/noticias/novo">
                        <Plus className="size-4" />
                        <span>Escrever Matéria</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Agendamento Social Rápido */}
      {isScheduleModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Agendar Publicação no Instagram"
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg bg-background text-foreground rounded-3xl border border-border p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Instagram className="size-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Agendar no Instagram</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="size-11 min-h-11 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSchedule} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="schedule-article-select" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Matéria da Publicação
                </label>
                <select
                  id="schedule-article-select"
                  value={targetArticleId}
                  onChange={(e) => {
                    setTargetArticleId(e.target.value);
                    const art = articles.find((a) => a.id === e.target.value);
                    if (art) {
                      setScheduleCaption(`${art.title}\n\nConfira a reportagem completa no portal.\n\n#noticias #${art.category.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
                    }
                  }}
                  className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {articles.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.category}] {a.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleChannel("instagram_feed")}
                  className={`h-11 min-h-11 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    scheduleChannel === "instagram_feed"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground border-border hover:bg-muted"
                  }`}
                >
                  <Newspaper className="size-4 shrink-0" />
                  <span>Feed (4:5)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleChannel("instagram_stories")}
                  className={`h-11 min-h-11 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    scheduleChannel === "instagram_stories"
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground border-border hover:bg-muted"
                  }`}
                >
                  <Layers className="size-4 shrink-0" />
                  <span>Stories (9:16)</span>
                </button>
              </div>

              <div className="space-y-2">
                <label htmlFor="schedule-time-input" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Data e Hora do Disparo
                </label>
                <input
                  id="schedule-time-input"
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="h-11 min-h-11 w-full rounded-2xl border border-border bg-card px-4 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="schedule-caption-input" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Legenda / Texto da Postagem
                </label>
                <textarea
                  id="schedule-caption-input"
                  rows={3}
                  value={scheduleCaption}
                  onChange={(e) => setScheduleCaption(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-card p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="h-11 min-h-11 px-4 rounded-2xl text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingSchedule}
                  className="h-11 min-h-11 px-5 rounded-2xl text-xs font-bold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSubmittingSchedule ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />}
                  <span>Confirmar Agendamento</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Studio Machine Escamas */}
      {studioProject && (
        <CarouselStudioEditor
          project={studioProject}
          isOpen={Boolean(studioProject)}
          onClose={() => setStudioProject(null)}
          onProjectUpdated={(up) => setStudioProject(up)}
        />
      )}

      {/* Modal de Desbloqueio de Curadoria IA & BYOK */}
      <AiCurationUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
}
