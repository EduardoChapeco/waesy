import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import {
 Newspaper,
 Plus,
 Eye,
 Trash2,
 Edit,
 ExternalLink,
 Calendar,
 Clock,
 CheckCircle2,
 FileText,
 Radio,
 Inbox,
 User,
 Phone,
 Megaphone,
 Bot,
 ThumbsUp,
 ThumbsDown,
 Loader2,
 Sparkles,
  Zap,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/services/news.functions";
import {
 listMinedArticles,
 curateMineArticle,
  batchCurateMineArticlesFn,
 type MinedArticleDTO,
} from "@/services/mining.functions";
import {
  isHealthyImageUrl,
  getFallbackThematicImage,
} from "@/services/mining/integrity-gate";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { EmptyState } from "@/components/state/states";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { AiCurationUpgradeModal } from "@/components/commerce/ai-curation-upgrade-modal";

export const Route = createFileRoute("/workspace/noticias/")({
 head: () => ({ meta: [{ title: "Redação & Gestão de Notícias | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [articles, tips, mined] = await Promise.all([
        listWorkspaceArticles().catch(() => []),
        listCommunityNewsTips().catch(() => []),
        listMinedArticles({ data: { limit: 20, status: "pending_review" } }).catch(() => ({ items: [], total: 0 })),
      ]);
      return {
        articles: Array.isArray(articles) ? articles : [],
        tips: Array.isArray(tips) ? tips : [],
        mined: Array.isArray(mined?.items) ? mined.items : [],
      };
    } catch (err) {
      console.error("[loader:workspace.noticias.index] Unhandled loader error:", err);
      return { articles: [], tips: [], mined: [] };
    }
  },
  component: WorkspaceNoticiasIndexPage,
});

function WorkspaceNoticiasIndexPage() {
  const rawLoaderData = (Route.useLoaderData?.() as any) || {};
  const initialArticles = Array.isArray(rawLoaderData.articles) ? rawLoaderData.articles : [];
  const initialMined = Array.isArray(rawLoaderData.mined) ? rawLoaderData.mined : [];
  const tips = Array.isArray(rawLoaderData.tips) ? rawLoaderData.tips : [];
  const [articles, setArticles] = useState<NewsArticleDTO[]>(initialArticles);
  const [minedArticles, setMinedArticles] = useState<MinedArticleDTO[]>(initialMined);
 const [activeTab, setActiveTab] = useState("materias");
 const [isPending, startTransition] = useTransition();
 const [curatingId, setCuratingId] = useState<string | null>(null);
  const [selectedMinedIds, setSelectedMinedIds] = useState<string[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

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

 // Studio Machine Carrossel
 const [studioProject, setStudioProject] = useState<EscamasCarouselProject | null>(null);
 const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false);

  const handleGenerateCarouselFromArticle = async (art: NewsArticleDTO) => {
    setIsGeneratingCarousel(true);
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
    } finally {
      setIsGeneratingCarousel(false);
    }
  };

  const handleGenerateCarouselFromMined = async (mined: MinedArticleDTO) => {
    setIsGeneratingCarousel(true);
    try {
      const res = await generateCarouselFromMinedContent({
        data: {
          contentType: "noticias",
          itemId: mined.id,
          title: mined.ai_structured_title || mined.raw_title || "Sem Título",
          summary: mined.ai_structured_subtitle || mined.ai_summary || "",
          coverUrl: mined.ai_suggested_cover_url,
          details: {
            category: mined.ai_suggested_category,
            ai_structured_sections: mined.ai_structured_sections,
          },
        },
      });
     setStudioProject(res.project);
     toast.success("Carrossel gerado no Studio Machine!");
   } catch (err: any) {
     toast.error("Erro ao gerar carrossel: " + (err.message || "Tente novamente."));
   } finally {
     setIsGeneratingCarousel(false);
   }
 };

 const refreshArticles = async () => {
 const updated = await listWorkspaceArticles().catch(() => []);
 setArticles(updated);
 };

 const handleDelete = async (id: string) => {

 try {
 await deleteArticle({ data: { id } });
 toast.success("Matéria removida com sucesso.");
 await refreshArticles();
 } catch {
 toast.error("Erro ao remover matéria.");
 }
 };

 const handleApproveMined = (mined: MinedArticleDTO) => {
 setCuratingId(mined.id);
 startTransition(async () => {
 try {
 await curateMineArticle({
 data: {
 mined_article_id: mined.id,
 action: "approve",
 },
 });
 toast.success("Notícia minerada aprovada e publicada!");
 setMinedArticles((prev) => prev.filter((m) => m.id !== mined.id));
 await refreshArticles();
 } catch (err: any) {
 toast.error(err.message || "Erro ao aprovar matéria");
 } finally {
 setCuratingId(null);
 }
 });
 };

 const handleRejectMined = (minedId: string) => {
 setCuratingId(minedId);
 startTransition(async () => {
 try {
 await curateMineArticle({
 data: {
 mined_article_id: minedId,
 action: "reject",
 curator_notes: "Rejeitado na curadoria do workspace",
 },
 });
 toast.success("Notícia minerada rejeitada.");
 setMinedArticles((prev) => prev.filter((m) => m.id !== minedId));
 } catch (err: any) {
 toast.error(err.message || "Erro ao rejeitar matéria");
 } finally {
 setCuratingId(null);
 }
 });
 };

 return (
 <div className="w-full space-y-6">
 {/* Header */}
 <PageHeader
 title="Redação & Notícias"
 actions={
 <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Configurar Chave de IA própria (BYOK) ou Plano"
                  >
                    <Sparkles className="size-3.5 text-primary" />
                    <span>Curadoria IA (BYOK)</span>
                  </Button>
 <Button asChild variant="outline" size="sm" className="rounded-xl font-bold text-xs gap-1.5">
 <Link to="/workspace/marketing/patrocinadores">
 <Megaphone className="size-3.5" />
 Patrocinadores & Ads
 </Link>
 </Button>
 <Button asChild size="sm" className="rounded-xl font-bold gap-1.5 text-xs">
 <Link to="/workspace/noticias/novo">
 <Plus className="size-3.5" />
 <span>Nova Matéria</span>
 </Link>
 </Button>
 </div>
 }
 />

 {/* Abas */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
 <TabsList className="grid grid-cols-3 sm:grid-cols-3 h-10 w-full max-w-md mb-6 p-1">
   <TabsTrigger value="materias" className="text-xs font-semibold gap-1.5 px-2">
     <Newspaper className="size-3.5 shrink-0" />
     <span className="truncate">Matérias ({articles.length})</span>
   </TabsTrigger>
   <TabsTrigger value="mineradas" className="text-xs font-semibold gap-1.5 px-2">
     <Radio className="size-3.5 shrink-0" />
     <span className="truncate">Mineradas ({minedArticles.length})</span>
   </TabsTrigger>
   <TabsTrigger value="pautas" className="text-xs font-semibold gap-1.5 px-2">
     <Inbox className="size-3.5 shrink-0" />
     <span className="truncate">Pautas ({tips.length})</span>
   </TabsTrigger>
 </TabsList>

 {/* ── Aba 1: Matérias ── */}
 <TabsContent value="materias" className="space-y-4">
 {articles.length === 0 ? (
 <EmptyState
 title="Nenhuma matéria publicada ainda"
 description="Comece a produzir notícias, reportagens e coberturas locais para engajar sua comunidade."
 />
 ) : (
 <div className="grid grid-cols-1 gap-4">
 {articles.map((art) => (
 <div
 key={art.id}
 className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
 >
 <div className="flex items-start gap-4 min-w-0">
 {art.cover_media_url && (
 <div className="size-16 rounded-xl overflow-hidden bg-muted shrink-0">
 <img
 src={art.cover_media_url}
 alt={art.title}
 className="size-full object-cover"
 />
 </div>
 )}

 <div className="space-y-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <Badge variant="outline" className="text-[10px] uppercase font-mono">
 {art.category}
 </Badge>
 <Badge
 variant={art.status === "published" ? "default" : "secondary"}
 className="text-[10px]"
 >
 {art.status === "published" ? "Publicado" : "Rascunho"}
 </Badge>
 </div>

 <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-1">
 {art.title}
 </h3>

 <div className="flex items-center gap-3 text-xs text-muted-foreground">
 <span className="flex items-center gap-1 font-mono">
 <Eye className="size-3.5" />
 {art.views_count || 0} views
 </span>
 <span>•</span>
 <span className="flex items-center gap-1 font-mono">
 <Clock className="size-3.5" />
 {art.reading_time_minutes || 3} min
 </span>
 </div>
 </div>
 </div>

 <div className="shrink-0 self-end sm:self-center">
                    <CrudActionsMenu
                      entityName="Matéria"
                      viewUrl={`/noticias/${art.slug}`}
                      customActions={[
                        {
                          label: "Gerar Carrossel (Studio)",
                          icon: Sparkles,
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

 {/* ── Aba 2: Mineradas com IA & OpenSquad ── */}
        <TabsContent value="mineradas" className="space-y-4">
          {minedArticles.length === 0 ? (
            <EmptyState
              title="Nenhuma notícia minerada pendente de curadoria"
              description="Quando novas notícias da cidade ou região forem extraídas por IA ou feeds RSS, elas aparecerão aqui para aprovação rápida."
            />
          ) : (
            <div className="space-y-3">
              {/* Barra de Ações em Lote do OpenSquad */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4 rounded-xl bg-card border border-border/60 shadow-2xs">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all-mined"
                    checked={
                      minedArticles.length > 0 &&
                      selectedMinedIds.length === minedArticles.length
                    }
                    onCheckedChange={toggleSelectAllMined}
                  />
                  <label
                    htmlFor="select-all-mined"
                    className="text-xs font-medium text-foreground cursor-pointer select-none"
                  >
                    {selectedMinedIds.length > 0 ? (
                      <span className="font-semibold text-primary">
                        {selectedMinedIds.length} selecionada(s)
                      </span>
                    ) : (
                      "Selecionar todas as matérias"
                    )}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={selectedMinedIds.length === 0 || isBatchProcessing}
                    onClick={() => handleBatchCurate("approve")}
                    className="h-8 px-3 rounded-xl font-bold text-xs gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {isBatchProcessing ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Zap className="size-3.5 fill-current" />
                    )}
                    Aprovar Selecionadas ({selectedMinedIds.length})
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedMinedIds.length === 0 || isBatchProcessing}
                    onClick={() => handleBatchCurate("reject")}
                    className="h-8 px-3 rounded-xl font-bold text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <ThumbsDown className="size-3.5" />
                    Rejeitar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {minedArticles.map((mined) => (
 <div
                    key={mined.id}
                    className={`p-4 sm:p-5 rounded-2xl bg-card border transition-colors space-y-3 ${
                      selectedMinedIds.includes(mined.id)
                        ? "border-primary/50 bg-primary/5 shadow-2xs"
                        : "border-border/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="pt-1">
                          <Checkbox
                            checked={selectedMinedIds.includes(mined.id)}
                            onCheckedChange={() => toggleSelectMined(mined.id)}
                            aria-label="Selecionar notícia"
                          />
                        </div>
                  <div className="relative size-14 rounded-xl overflow-hidden bg-muted shrink-0">
                    <img
                      src={mined.ai_suggested_cover_url || getFallbackThematicImage(mined.ai_suggested_category)}
                      alt=""
                      className="size-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = getFallbackThematicImage(mined.ai_suggested_category);
                      }}
                    />
                    {!isHealthyImageUrl(mined.ai_suggested_cover_url) && (
                      <span className="absolute bottom-0 right-0 rounded-tl-md bg-amber-500 text-[8px] font-bold px-1 text-white" title="Fallback fotográfico em alta definição">
                        HD
                      </span>
                    )}
                  </div>
 <div className="space-y-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 {mined.ai_suggested_kicker && (
 <Badge variant="outline" className="text-[10px] font-mono uppercase text-primary">
 {mined.ai_suggested_kicker}
 </Badge>
 )}
 <span className="text-[11px] font-mono text-muted-foreground">
 {mined.source_domain}
 </span>
 <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
 Score {mined.quality_score || 75}/100
 </span>
 </div>

 <h3 className="text-sm font-bold text-foreground line-clamp-2">
 {mined.ai_structured_title || mined.raw_title}
 </h3>

 {mined.ai_summary && (
 <p className="text-xs text-muted-foreground line-clamp-2">
 {mined.ai_summary}
 </p>
 )}
 </div>
 </div>

 <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateCarouselFromMined(mined)}
                    disabled={isGeneratingCarousel}
                    className="rounded-xl font-bold text-xs border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 gap-1 h-8"
                    title="Gerar Carrossel no Studio para Instagram"
                  >
                    <Sparkles className="size-3.5" />
                    Carrossel
                  </Button>
                  <Button
                    size="sm"
                    disabled={curatingId === mined.id}
                    onClick={() => handleApproveMined(mined)}
                    className="rounded-xl font-bold text-xs gap-1 h-8"
                  >
                    {curatingId === mined.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ThumbsUp className="size-3.5" />
                    )}
                    Aprovar
                  </Button>
 <Button
 variant="outline"
 size="sm"
 disabled={curatingId === mined.id}
 onClick={() => handleRejectMined(mined.id)}
 className="rounded-xl font-bold text-xs border-destructive/30 text-destructive hover:bg-destructive/10 gap-1 h-8"
 >
 <ThumbsDown className="size-3.5" />
 Rejeitar
 </Button>
 </div>
 </div>
 </div>
 ))}
 </div>
              </div>
 )}
 </TabsContent>

 {/* ── Aba 3: Pautas dos Leitores ── */}
 <TabsContent value="pautas" className="space-y-4">
 {tips.length === 0 ? (
 <EmptyState
 title="Nenhuma sugestão de pauta pendente"
 description="Quando os leitores enviarem denúncias ou sugestões no portal, elas aparecerão aqui para a redação analisar."
 />
 ) : (
 <div className="grid grid-cols-1 gap-4">
 {tips.map((tip: any) => (
 <div
 key={tip.id}
 className="p-4 sm:p-5 rounded-2xl bg-card border border-border/60 space-y-3"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <User className="size-3.5" />
 <span className="font-bold text-foreground">{tip.author_name}</span>
 {tip.contact_info && (
 <>
 <span>•</span>
 <span className="flex items-center gap-1 font-mono">
 <Phone className="size-3" />
 {tip.contact_info}
 </span>
 </>
 )}
 </div>
 <Badge variant="outline" className="text-[10px]">
 {tip.status === "pending" ? "Pendente" : tip.status}
 </Badge>
 </div>

 <p className="text-xs sm:text-sm text-foreground whitespace-pre-line leading-relaxed">
 {tip.tip_text}
 </p>

 <div className="pt-2 border-t border-border/40 flex items-center justify-between">
 <span className="text-[11px] text-muted-foreground">
 {new Date(tip.created_at).toLocaleDateString("pt-BR", {
 day: "2-digit",
 month: "short",
 hour: "2-digit",
 minute: "2-digit",
 })}
 </span>
 <Button asChild size="sm" variant="outline" className="h-7 text-xs font-bold gap-1">
 <Link to="/workspace/noticias/novo">
 <Plus className="size-3" />
 Escrever Matéria
 </Link>
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}
 </TabsContent>
 </Tabs>

 {/* MODAL STUDIO MACHINE ESCAMAS */}
 {studioProject && (
   <CarouselStudioEditor
     project={studioProject}
     isOpen={!!studioProject}
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