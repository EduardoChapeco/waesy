import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Layers,
  Sparkles,
  Plus,
  Flame,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Brain,
  Sliders,
  Settings2,
  ArrowRight,
  Eye,
  Heart,
  X,
  Star,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  listMatchDeckTemplatesFn,
  upsertMatchCardFn,
  deleteMatchCardFn,
  generateMatchDeckAiBatchFn,
  getMatchDeckBatchFn,
  recordMatchSwipeAndAnalyzeFn,
  MatchCardDTO,
} from "@/services/match-engine.functions";

export const Route = createFileRoute("/workspace/match-time")({
  head: () => ({
    meta: [{ title: "OmniMatch Studio | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const templates = await listMatchDeckTemplatesFn();
      return { templates, loadError: null };
    } catch (err: any) {
      console.error("[loader:workspace.match-time] Loader error:", err);
      return { templates: [], loadError: err?.message || "Não foi possível carregar templates de match." };
    }
  },
  component: WorkspaceMatchTimeStudioPage,
});

export default function WorkspaceMatchTimeStudioPage() {
  const loaderData = Route.useLoaderData();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"decks" | "cards" | "simulator">("decks");
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isNewCardDialogOpen, setIsNewCardDialogOpen] = useState(false);

  // Formulário de Nova Carta
  const [cardKind, setCardKind] = useState<"trade_off" | "hot_offer" | "travel_package" | "product">("trade_off");
  const [cardTitle, setCardTitle] = useState("");
  const [cardSubtitle, setCardSubtitle] = useState("");
  const [cardBadge, setCardBadge] = useState("");
  const [cardCoverUrl, setCardCoverUrl] = useState("");
  const [cardTradeOffAxis, setCardTradeOffAxis] = useState("budget_vs_luxury");
  const [cardWeightPositive, setCardWeightPositive] = useState(0.8);
  const [cardWeightNegative, setCardWeightNegative] = useState(-0.5);
  const [cardCtaLabel, setCardCtaLabel] = useState("Quero Conhecer");

  // Simulador
  const [simIndex, setSimIndex] = useState(0);
  const [simSessionId] = useState(() => `sim-session-${Date.now()}`);

  const { data: templates = loaderData.templates, isLoading: isLoadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ["match-deck-templates"],
    queryFn: () => listMatchDeckTemplatesFn(),
    initialData: loaderData.templates,
  });

  if (isLoadingTemplates) {
    return (
      <div className="flex-1 p-6 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
        <span>Carregando templates do OmniMatch...</span>
      </div>
    );
  }

  const { data: deckBatch, refetch: refetchSimDeck } = useQuery({
    queryKey: ["sim-match-deck-batch", simSessionId],
    queryFn: () =>
      getMatchDeckBatchFn({
        data: {
          visitorSessionId: simSessionId,
          deckTemplateSlug: "default",
          limit: 10,
        },
      }),
  });

  const simCards = deckBatch?.cards || [];
  const currentSimCard = simCards[simIndex];

  const handleSimSwipe = async (action: "like" | "pass" | "superlike") => {
    if (!currentSimCard) return;

    try {
      await recordMatchSwipeAndAnalyzeFn({
        data: {
          storeId: currentSimCard.deckTemplateId ? templates[0]?.id || "" : "",
          visitorSessionId: simSessionId,
          cardId: currentSimCard.id,
          action,
          dwellTimeMs: 1200,
        },
      });
      toast.success(action === "like" ? "Gostei registrado!" : action === "superlike" ? "Superlike registrado!" : "Passe registrado.");
      setSimIndex((prev) => prev + 1);
      refetchSimDeck();
    } catch {
      setSimIndex((prev) => prev + 1);
    }
  };

  const handleSaveCard = async () => {
    if (!cardTitle.trim()) {
      toast.error("O título da carta é obrigatório.");
      return;
    }
    const deckId = selectedDeckId || templates[0]?.id;
    if (!deckId) {
      toast.error("Nenhum template de deck ativo encontrado. Crie um deck primeiro.");
      return;
    }

    try {
      const axisWeights: Record<string, number> = {};
      if (cardTradeOffAxis) {
        const [posKey, negKey] = cardTradeOffAxis.split("_vs_");
        if (posKey) axisWeights[posKey] = cardWeightPositive;
        if (negKey) axisWeights[negKey] = cardWeightNegative;
      }

      await upsertMatchCardFn({
        data: {
          deckTemplateId: deckId,
          cardKind,
          title: cardTitle.trim(),
          subtitle: cardSubtitle.trim() || undefined,
          badge: cardBadge.trim() || undefined,
          coverImageUrl: cardCoverUrl.trim() || undefined,
          tradeOffAxis: cardTradeOffAxis,
          axisWeights,
          ctaLabel: cardCtaLabel.trim() || "Quero Conhecer",
          displayOrder: 0,
          active: true,
        },
      });

      toast.success("Carta criada com sucesso!");
      setIsNewCardDialogOpen(false);
      setCardTitle("");
      setCardSubtitle("");
      setCardCoverUrl("");
      refetchTemplates();
      queryClient.invalidateQueries({ queryKey: ["sim-match-deck-batch"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar carta.");
    }
  };

  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const handleGenerateAiBatch = async () => {
    const deckId = selectedDeckId || templates[0]?.id;
    if (!deckId) {
      toast.error("Selecione um template de deck primeiro.");
      return;
    }
    const currentTemplate = templates.find((t: any) => t.id === deckId);
    setIsGeneratingBatch(true);
    try {
      const res = await generateMatchDeckAiBatchFn({
        data: {
          deckTemplateId: deckId,
          nicheId: currentTemplate?.nicheId || "turismo",
          count: 4,
        },
      });
      toast.success(`${res.count} perguntas de trade-off geradas com sucesso!`);
      refetchTemplates();
      queryClient.invalidateQueries({ queryKey: ["sim-match-deck-batch"] });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao gerar perguntas.");
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header do Studio */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="gap-2 px-3 py-1 text-xs font-bold uppercase">
              <Brain className="size-3.5" />
              OmniMatch & MatchTravel
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              IA Neural
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Studio de Descoberta & Decks de Swipe
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Configure cartas de trade-off para extrair preferências, calibre o cérebro vetorial e conecte leads direto ao CRM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateAiBatch}
            disabled={isGeneratingBatch || templates.length === 0}
            className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isGeneratingBatch ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Sparkles className="size-4 text-primary" />
            )}
            Gerar Perguntas IA
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={() => setIsNewCardDialogOpen(true)}
            className="h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4" />
            Nova Carta
          </Button>
        </div>
      </div>

      {/* Navegação entre Abas */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <Button
          type="button"
          variant={activeTab === "decks" ? "outline" : "ghost"}
          onClick={() => setActiveTab("decks")}
          className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Layers className="size-4" />
          Templates de Decks ({templates.length})
        </Button>
        <Button
          type="button"
          variant={activeTab === "simulator" ? "outline" : "ghost"}
          onClick={() => setActiveTab("simulator")}
          className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Eye className="size-4" />
          Simulador Tátil
        </Button>
      </div>

      {/* Conteúdo da Aba Decks */}
      {activeTab === "decks" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl: any) => (
              <div
                key={tpl.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={tpl.active ? "default" : "secondary"} className="text-xs">
                      {tpl.active ? "Ativo" : "Pausado"}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      {tpl.cardCount || 0} cartas
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{tpl.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {tpl.description || "Deck de qualificação interativa."}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                  <span className="text-2xs font-mono text-muted-foreground">
                    slug: /{tpl.slug}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDeckId(tpl.id);
                      setIsNewCardDialogOpen(true);
                    }}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="size-3.5" />
                    Add Carta
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Conteúdo do Simulador Tátil */}
      {activeTab === "simulator" ? (
        <div className="max-w-md mx-auto space-y-4 py-4">
          <div className="text-center space-y-1">
            <h2 className="text-sm font-bold text-foreground">Simulador de Swipe em Tempo Real</h2>
            <p className="text-xs text-muted-foreground">
              Teste a experiência que o cliente terá no App Próprio ou Vitrine.
            </p>
          </div>

          {currentSimCard ? (
            <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
              <div className="relative aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
                {currentSimCard.coverImageUrl ? (
                  <img
                    src={currentSimCard.coverImageUrl}
                    alt={currentSimCard.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <Layers className="size-12 text-muted-foreground/40" />
                )}
                {currentSimCard.badge ? (
                  <Badge className="absolute top-3 left-3 bg-foreground/90 text-background text-xs font-bold">
                    {currentSimCard.badge}
                  </Badge>
                ) : null}
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">{currentSimCard.title}</h3>
                  {currentSimCard.subtitle ? (
                    <p className="text-xs text-muted-foreground">{currentSimCard.subtitle}</p>
                  ) : null}
                </div>

                {currentSimCard.tradeOffAxis ? (
                  <div className="rounded-lg bg-muted/40 p-2 text-2xs space-y-1 font-mono">
                    <span className="font-bold text-foreground block">
                      Eixo Neural: {currentSimCard.tradeOffAxis}
                    </span>
                    <span className="text-muted-foreground">
                      Pesos: {JSON.stringify(currentSimCard.axisWeights)}
                    </span>
                  </div>
                ) : null}

                {/* Botões de Ação Táteis (Piso 44px) */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSimSwipe("pass")}
                    aria-label="Passar carta"
                    className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimSwipe("superlike")}
                    aria-label="Superlike na carta"
                    className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimSwipe("like")}
                    aria-label="Gostar da carta"
                    className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-primary-foreground cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Heart className="size-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-3">
              <CheckCircle2 className="size-8 text-primary mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Fim das cartas do lote</h3>
              <p className="text-xs text-muted-foreground">
                Todas as cartas do lote de teste foram percorridas.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSimIndex(0)}
                className="h-11 min-h-11 px-4 text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Reiniciar Simulador
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {/* Diálogo de Criação de Carta */}
      <Dialog open={isNewCardDialogOpen} onOpenChange={setIsNewCardDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Nova Carta do OmniMatch
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre uma carta de trade-off ou conecte a uma oferta/produto real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tipo da Carta</Label>
              <Select value={cardKind} onValueChange={(v: any) => setCardKind(v)}>
                <SelectTrigger className="h-11 min-h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trade_off">Trade-off de Preferência (Dilema)</SelectItem>
                  <SelectItem value="hot_offer">Oferta Quente (Hot Offer)</SelectItem>
                  <SelectItem value="travel_package">Pacote de Viagem / Turismo</SelectItem>
                  <SelectItem value="product">Produto Físico de Catálogo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Título Principal</Label>
              <Input
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                placeholder="Ex: Resorts com All-Inclusive ou Pousadas Charmosas?"
                className="h-11 min-h-11 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subtítulo / Descrição Rápida</Label>
              <Input
                value={cardSubtitle}
                onChange={(e) => setCardSubtitle(e.target.value)}
                placeholder="Ex: Descubra o estilo de hospedagem perfeito para você"
                className="h-11 min-h-11 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Selo / Badge</Label>
                <Input
                  value={cardBadge}
                  onChange={(e) => setCardBadge(e.target.value)}
                  placeholder="Ex: DILEMA DE VIAGEM"
                  className="h-11 min-h-11 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Eixo Neural de Preferência</Label>
                <Select value={cardTradeOffAxis} onValueChange={setCardTradeOffAxis}>
                  <SelectTrigger className="h-11 min-h-11 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget_vs_luxury">Econômico vs Luxo</SelectItem>
                    <SelectItem value="beach_vs_mountain">Praia vs Montanha</SelectItem>
                    <SelectItem value="adventure_vs_relax">Aventura vs Descanso</SelectItem>
                    <SelectItem value="prazo_vs_desconto">Prazo 30d vs Desconto à Vista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">URL da Imagem de Capa</Label>
              <Input
                value={cardCoverUrl}
                onChange={(e) => setCardCoverUrl(e.target.value)}
                placeholder="https://cdn.waesy.com.br/capa-card.jpg"
                className="h-11 min-h-11 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewCardDialogOpen(false)}
                className="h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveCard}
                className="h-11 min-h-11 px-4 text-xs font-bold cursor-pointer"
              >
                Salvar Carta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
