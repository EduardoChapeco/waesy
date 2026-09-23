import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  Plus,
  Loader2,
  MapPin,
  Eye,
  Edit3,
  Image as ImageIcon,
  Flame,
  MessageCircle,
  Handshake,
  PauseCircle,
  PlayCircle,
  Check,
  Copy,
  ExternalLink,
  AlertTriangle,
  Clock,
  CheckCircle2,
  QrCode,
  RefreshCw,
  Building2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  getClassifieds,
  updateClassifiedStatus,
  getBoostPaymentStatus,
  initiateBoostPayment,
  getBoostPaymentById,
  convertClassifiedToWorkspaceStore,
} from "@/services/classifieds.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { resolveClassifiedNiche } from "@/lib/classifieds/semantics";

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
}

export const Route = createFileRoute("/_store/conta/classificados/")({
  head: () => ({ meta: [{ title: "Meus Anúncios | Waesy" }] }),
  component: ClassificadosIndex,
});

const CATEGORY_LABELS: Record<string, string> = {
  sale: "Desapego",
  vehicle: "Veículo",
  real_estate: "Imóvel",
  service: "Serviço",
  job: "Vaga",
  trade: "Troca",
  donation: "Doação",
  travel: "Viagem",
  equipment: "Equipamento",
  event: "Evento",
};

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  published: { label: "Publicado", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  active: { label: "Publicado", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  draft: { label: "Rascunho", className: "border-border/60 bg-muted/50 text-muted-foreground" },
  paused: { label: "Pausado", className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  reserved: { label: "Reservado", className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  negotiating: { label: "Negociando", className: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400" },
  completed: { label: "Finalizado", className: "border-border/60 bg-muted/40 text-muted-foreground" },
  archived: { label: "Arquivado", className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400" },
};

const BOOST_PLANS = [
  {
    id: 7,
    days: 7 as const,
    title: "Destaque 7 Dias",
    priceCents: 1990,
    badge: "Iniciante",
    description: "Ideal para vendas rápidas e itens de alta procura.",
  },
  {
    id: 15,
    days: 15 as const,
    title: "Destaque 15 Dias",
    priceCents: 3490,
    badge: "Mais Escolhido",
    highlight: true,
    description: "Maior retenção no topo das buscas e recomendação no feed.",
  },
  {
    id: 30,
    days: 30 as const,
    title: "Destaque 30 Dias",
    priceCents: 5990,
    badge: "Melhor Custo",
    description: "Exposição prolongada com prioridade máxima na categoria.",
  },
];

// ────────────────────────────────────────────────────────────────
// Tipos para o fluxo de pagamento de boost
// ────────────────────────────────────────────────────────────────
type BoostStep =
  | "plan_select"      // escolha do plano
  | "checkout_pending" // aguardando pagamento (PIX / link)
  | "paid";            // confirmado

interface ActiveBoostPayment {
  boostPaymentId: string;
  provider: "asaas" | "stripe";
  pixQrCode: string | null;
  pixCopyPaste: string | null;
  paymentLink: string | null;
  amountCents: number;
  planName: string;
  planDays: number;
  expiresAt: string;
  adTitle: string;
}

function ClassificadosIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [boostingAd, setBoostingAd] = useState<any | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<7 | 15 | 30>(15);
  const [boostStep, setBoostStep] = useState<BoostStep>("plan_select");
  const [activeBoostPayment, setActiveBoostPayment] = useState<ActiveBoostPayment | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Estado de Migração para Loja no Workspace Pro (Fase 5)
  const [migratingAd, setMigratingAd] = useState<any | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrateToPro = async () => {
    if (!migratingAd) return;
    setIsMigrating(true);
    try {
      const res = await convertClassifiedToWorkspaceStore({
        data: { classifiedId: migratingAd.id },
      });
      toast.success("Anúncio transformado em Loja Pro no Workspace!");
      setMigratingAd(null);
      if (typeof window !== "undefined") {
        window.document.cookie = `waesy_active_tenant=${res.storeId}; path=/; max-age=31536000; SameSite=Lax`;
      }
      navigate({ to: "/workspace" });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao migrar anúncio para Loja Pro.");
    } finally {
      setIsMigrating(false);
    }
  };

  // ── Consulta gateway de pagamento ANTES de abrir modal ──────────
  const { data: gatewayStatus, isLoading: gatewayLoading } = useQuery({
    queryKey: ["boost-gateway-status"],
    queryFn: () => getBoostPaymentStatus(),
    staleTime: 60_000, // cache 1min
  });

  const { data: classifieds, isLoading } = useQuery({
    queryKey: ["classifieds"],
    queryFn: () => getClassifieds(),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: "active" | "paused" }) => {
      return await updateClassifiedStatus({ data: { id, status: newStatus } });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.newStatus === "active" ? "Anúncio ativado com sucesso!" : "Anúncio pausado."
      );
      queryClient.invalidateQueries({ queryKey: ["classifieds"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao alterar status do anúncio.");
    },
  });

  // ── Mutation: Inicia pagamento real via gateway ──────────────────
  const initiateBoostMutation = useMutation({
    mutationFn: async ({ adId, planDays }: { adId: string; planDays: 7 | 15 | 30 }) => {
      return await initiateBoostPayment({ data: { adId, planDays } });
    },
    onSuccess: (res) => {
      setActiveBoostPayment({
        boostPaymentId: res.boostPaymentId,
        provider: res.provider,
        pixQrCode: res.pixQrCode,
        pixCopyPaste: res.pixCopyPaste,
        paymentLink: res.paymentLink,
        amountCents: res.amountCents,
        planName: res.planName,
        planDays: res.planDays,
        expiresAt: res.expiresAt,
        adTitle: res.adTitle,
      });
      setBoostStep("checkout_pending");
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao iniciar pagamento.");
    },
  });

  // ── Polling: verifica status do pagamento a cada 5s ─────────────
  const { data: boostPaymentStatus } = useQuery({
    queryKey: ["boost-payment-status", activeBoostPayment?.boostPaymentId],
    queryFn: () =>
      getBoostPaymentById({ data: { boostPaymentId: activeBoostPayment!.boostPaymentId } }),
    enabled: boostStep === "checkout_pending" && !!activeBoostPayment?.boostPaymentId,
    refetchInterval: 5000,
  });

  // Detecta pagamento confirmado via polling
  useEffect(() => {
    if (boostPaymentStatus?.status === "paid") {
      setBoostStep("paid");
      queryClient.invalidateQueries({ queryKey: ["classifieds"] });
    }
  }, [boostPaymentStatus?.status, queryClient]);

  const handleOpenBoostModal = useCallback(
    (ad: any) => {
      if (!gatewayStatus?.available) {
        toast.error(
          "Pagamento não configurado. O administrador da plataforma precisa configurar um gateway de pagamento.",
          { duration: 6000 }
        );
        return;
      }
      setBoostingAd(ad);
      setBoostStep("plan_select");
      setActiveBoostPayment(null);
      setSelectedPlan(15);
      setCopiedPix(false);
    },
    [gatewayStatus]
  );

  const handleCloseBoostModal = () => {
    setBoostingAd(null);
    setBoostStep("plan_select");
    setActiveBoostPayment(null);
    setCopiedPix(false);
  };

  const handleCopyPix = async () => {
    if (!activeBoostPayment?.pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(activeBoostPayment.pixCopyPaste);
      setCopiedPix(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopiedPix(false), 3000);
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  };

  const safeClassifieds = Array.isArray(classifieds) ? classifieds : [];
  const filtered = safeClassifieds.filter((ad: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      ad.title?.toLowerCase().includes(term) ||
      ad.description?.toLowerCase().includes(term) ||
      ad.category?.toLowerCase().includes(term)
    );
  });

  // Verifica se gateway está disponível para exibição do botão
  const gatewayAvailable = gatewayStatus?.available ?? false;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Meus Anúncios
          </h1>
          {(classifieds || []).length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {(classifieds || []).length}
            </Badge>
          )}
        </div>

        <Button asChild size="sm" className="rounded-xl h-8 px-3.5 text-xs font-semibold gap-1.5 bg-foreground text-background hover:bg-foreground/90 shrink-0 shadow-xs cursor-pointer">
          <Link to="/conta/classificados/novo">
            <Plus className="size-3.5" />
            <span>Novo Anúncio</span>
          </Link>
        </Button>
      </div>

      {/* ── Aviso: Gateway não configurado ──────────────────────── */}
      {!gatewayLoading && !gatewayAvailable && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Impulsionamento indisponível.</span> Nenhum gateway de pagamento está configurado na plataforma. O recurso de destaque ficará bloqueado até a configuração.
          </div>
        </div>
      )}

      {/* ── Filtro de Busca ─────────────────────────────────────── */}
      {classifieds && classifieds.length > 0 && (
        <div className="max-w-md">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, categoria..."
            className="h-11 sm:h-9 rounded-xl text-xs bg-background border-border/70"
          />
        </div>
      )}

      {/* ── Lista de Anúncios ────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="size-6 animate-spin" />
          <span className="text-xs">Carregando seus anúncios...</span>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((ad: any) => {
            const statusConf = STATUS_CONFIG[ad.status] || STATUS_CONFIG.draft;
            const isBoosted = ad.is_boosted && ad.boosted_until && new Date(ad.boosted_until) > new Date();
            const isPaused = ad.status === "paused";
            const thumbUrl = ad.images?.[0] || null;
            const isVideo = isVideoUrl(thumbUrl);
            const niche = resolveClassifiedNiche(ad);
            const NicheIcon = niche.icon;

            return (
              <div
                key={ad.id}
                className="rounded-2xl border border-border/60 bg-card overflow-hidden"
              >
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="size-16 sm:size-20 rounded-xl bg-muted shrink-0 overflow-hidden border border-border/40 flex items-center justify-center">
                    {thumbUrl ? (
                      isVideo ? (
                        <video src={thumbUrl} className="size-full object-cover" muted />
                      ) : (
                        <img src={thumbUrl} alt={ad.title} className="size-full object-cover" />
                      )
                    ) : (
                      <ImageIcon className="size-6 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-foreground truncate leading-tight">
                        {ad.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {isBoosted && (
                          <Badge className="text-[9px] font-mono px-1.5 py-0 bg-amber-500 text-black border-none">
                            DESTAQUE
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn("text-[9px] font-mono px-1.5 py-0", statusConf.className)}>
                          {statusConf.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <NicheIcon className="size-3 text-muted-foreground/70" />
                        {niche.shortLabel}
                      </span>
                      {ad.ai_agent_enabled && (
                        <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 gap-1 border-primary/30 text-primary bg-primary/5">
                          <Sparkles className="size-2.5" />
                          SDR Ativo
                        </Badge>
                      )}
                      {ad.location_city && (
                        <>
                          <span className="text-[10px] text-muted-foreground/40">·</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="size-2.5" />
                            {ad.location_city}
                          </span>
                        </>
                      )}
                    </div>

                    {ad.price_cents != null && (
                      <p className="text-sm font-black font-mono text-foreground">
                        {formatMoney(ad.price_cents)}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {ad.views_count != null && (
                        <span className="flex items-center gap-0.5">
                          <Eye className="size-2.5" />
                          {ad.views_count}
                        </span>
                      )}
                      {ad.proposals_count != null && ad.proposals_count > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Handshake className="size-2.5" />
                          {ad.proposals_count} proposta{ad.proposals_count !== 1 ? "s" : ""}
                        </span>
                      )}
                      {isBoosted && ad.boosted_until && (
                        <span className="text-amber-600 font-medium flex items-center gap-0.5">
                          <Flame className="size-2.5" />
                          até {formatDate(ad.boosted_until)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="border-t border-border/40 bg-muted/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs h-9 sm:h-8 border-border/70 cursor-pointer"
                    >
                      <Link to="/conta/classificados/novo" search={{ editId: ad.id }}>
                        <Edit3 className="size-3.5 mr-1" />
                        <span>Editar</span>
                      </Link>
                    </Button>

                    {ad.store_id ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs h-9 sm:h-8 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer gap-1"
                      >
                        <Link to="/workspace">
                          <Building2 className="size-3.5" />
                          <span>Loja Pro</span>
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMigratingAd(ad)}
                        className="rounded-xl text-xs h-9 sm:h-8 border-border/70 hover:border-primary/50 text-foreground hover:text-primary cursor-pointer gap-1"
                        title="Transformar este anúncio em uma empresa profissional no Workspace"
                      >
                        <Sparkles className="size-3.5 text-primary" />
                        <span>Migrar Pro</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botão Impulsionar / Destacar */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenBoostModal(ad)}
                      disabled={!gatewayAvailable || gatewayLoading}
                      title={
                        !gatewayAvailable
                          ? "Pagamento não configurado na plataforma"
                          : isBoosted
                          ? "Renovar destaque"
                          : "Impulsionar anúncio"
                      }
                      className={`rounded-xl text-xs h-9 sm:h-8 flex-1 font-bold gap-1 cursor-pointer transition-all ${
                        !gatewayAvailable
                          ? "bg-muted text-muted-foreground border border-border/50 cursor-not-allowed opacity-60"
                          : isBoosted
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                          : "bg-amber-500 text-black hover:bg-amber-400 shadow-xs"
                      }`}
                    >
                      <Flame className="size-3.5 fill-current" />
                      <span>
                        {!gatewayAvailable
                          ? "Indisponível"
                          : isBoosted
                          ? "Renovar Destaque"
                          : "Impulsionar"}
                      </span>
                    </Button>

                    {/* Botão Pausar / Reativar */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: ad.id,
                          newStatus: isPaused ? "active" : "paused",
                        })
                      }
                      disabled={toggleStatusMutation.isPending}
                      className="rounded-xl text-xs h-9 sm:h-8 px-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      title={isPaused ? "Reativar Anúncio" : "Pausar Anúncio"}
                    >
                      {isPaused ? (
                        <PlayCircle className="size-4 text-emerald-600" />
                      ) : (
                        <PauseCircle className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-border/60 bg-card rounded-2xl p-10 text-center space-y-3">
          <div className="size-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <Tag className="size-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">
            {searchTerm
              ? "Nenhum anúncio corresponde à sua busca"
              : "Você ainda não publicou nenhum anúncio"}
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchTerm
              ? "Tente buscar por outras palavras-chave ou limpe o campo de busca."
              : "Desapegue de itens, anuncie imóveis, veículos, vagas ou ofereça seus serviços na plataforma."}
          </p>
          {!searchTerm && (
            <Button asChild size="sm" className="rounded-xl text-xs font-bold gap-1.5 mt-2 h-11 px-5">
              <Link to="/conta/classificados/novo">
                <Plus className="size-4" />
                <span>Criar Anúncio</span>
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* ── MODAL DE IMPULSIONAMENTO (CHECKOUT REAL) ── */}
      <Dialog open={!!boostingAd} onOpenChange={(open) => !open && handleCloseBoostModal()}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
          {/* ─── ETAPA 1: Seleção de Plano ─── */}
          {boostStep === "plan_select" && (
            <div className="p-6 space-y-4">
              <DialogHeader className="space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Flame className="size-4 fill-amber-500 text-amber-500" />
                  </div>
                  <DialogTitle className="text-base font-bold">Impulsionar Anúncio</DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  Destaque <strong>"{boostingAd?.title}"</strong> no topo da categoria e receba até 3x mais contatos.
                </DialogDescription>
              </DialogHeader>

              {/* Provider badge */}
              {gatewayStatus?.provider && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-3 py-2">
                  <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    {gatewayStatus.provider === "asaas"
                      ? "Pagamento via PIX · Asaas"
                      : "Pagamento via Cartão · Stripe"}
                  </span>
                </div>
              )}

              {/* Vantagens */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2 text-xs">
                {[
                  "Prioridade no topo das buscas da sua cidade",
                  "Selo dourado de Destaque visível a todos",
                  "Mais cliques diretos para o seu WhatsApp",
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 text-foreground">
                    <Check className="size-3.5 text-emerald-600 shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Seleção de Planos */}
              <div className="space-y-2">
                <span className="text-xs font-bold font-mono uppercase text-muted-foreground tracking-wider block">
                  Escolha o Período
                </span>
                <div className="space-y-2">
                  {BOOST_PLANS.map((plan) => {
                    const isSelected = selectedPlan === plan.days;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.days)}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/10 shadow-xs"
                            : "border-border/60 bg-card hover:bg-muted/30"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{plan.title}</span>
                            {plan.badge && (
                              <Badge
                                variant={isSelected ? "default" : "outline"}
                                className={`text-[9px] font-mono px-1.5 py-0 ${
                                  isSelected ? "bg-amber-500 text-black border-none" : ""
                                }`}
                              >
                                {plan.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{plan.description}</p>
                        </div>
                        <span className="text-sm font-black font-mono text-foreground shrink-0 ml-3">
                          {formatMoney(plan.priceCents)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botões */}
              <div className="pt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseBoostModal}
                  className="rounded-xl text-xs h-11 flex-1 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    boostingAd &&
                    initiateBoostMutation.mutate({ adId: boostingAd.id, planDays: selectedPlan })
                  }
                  disabled={initiateBoostMutation.isPending}
                  className="rounded-xl text-xs h-11 flex-1 font-bold bg-amber-500 text-black hover:bg-amber-400 gap-1.5 cursor-pointer shadow-sm"
                >
                  {initiateBoostMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Gerando cobrança...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="size-4" />
                      <span>Ir para Pagamento</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ─── ETAPA 2: Aguardando Pagamento ─── */}
          {boostStep === "checkout_pending" && activeBoostPayment && (
            <div className="p-6 space-y-4">
              <div className="text-center space-y-1">
                <div className="size-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
                  <QrCode className="size-6 text-amber-600" />
                </div>
                <h3 className="font-black text-base text-foreground">Pague com PIX</h3>
                <p className="text-xs text-muted-foreground">
                  Escaneie o QR Code ou copie o código abaixo.
                  <br />O destaque é ativado automaticamente após confirmação.
                </p>
              </div>

              {/* Valor */}
              <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/50 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">{activeBoostPayment.planName}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">"{activeBoostPayment.adTitle}"</p>
                </div>
                <p className="text-xl font-black font-mono text-foreground">
                  {formatMoney(activeBoostPayment.amountCents)}
                </p>
              </div>

              {/* QR Code PIX */}
              {activeBoostPayment.pixQrCode ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-xl border border-border/60 bg-white p-3 inline-block">
                    <img
                      src={`data:image/png;base64,${activeBoostPayment.pixQrCode}`}
                      alt="QR Code PIX"
                      className="size-44 object-contain"
                    />
                  </div>

                  {activeBoostPayment.pixCopyPaste && (
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="w-full flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">PIX Copia e Cola</p>
                        <p className="text-xs text-foreground font-mono truncate">
                          {activeBoostPayment.pixCopyPaste.slice(0, 40)}...
                        </p>
                      </div>
                      {copiedPix ? (
                        <Check className="size-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Copy className="size-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  )}
                </div>
              ) : activeBoostPayment.paymentLink ? (
                // Fallback: link de pagamento (Stripe ou Asaas invoice)
                <div className="space-y-2">
                  <a
                    href={activeBoostPayment.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
                  >
                    <ExternalLink className="size-4" />
                    Abrir Página de Pagamento
                  </a>
                  <p className="text-center text-[10px] text-muted-foreground">
                    Você será redirecionado ao portal seguro do gateway.
                  </p>
                </div>
              ) : (
                <div className="text-center text-xs text-muted-foreground py-4">
                  <Loader2 className="size-5 animate-spin mx-auto mb-2" />
                  Carregando instrução de pagamento...
                </div>
              )}

              {/* Status polling */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="size-3 animate-spin" />
                <span>Verificando pagamento automaticamente...</span>
              </div>

              {/* Expiração */}
              {activeBoostPayment.expiresAt && (
                <div className="flex items-center gap-1.5 justify-center text-[10px] text-muted-foreground">
                  <Clock className="size-3" />
                  <span>
                    Link expira em{" "}
                    {new Date(activeBoostPayment.expiresAt).toLocaleString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                onClick={handleCloseBoostModal}
                className="w-full rounded-xl text-xs h-9 text-muted-foreground cursor-pointer"
              >
                Fechar (pagamento pendente)
              </Button>
            </div>
          )}

          {/* ─── ETAPA 3: Pagamento Confirmado ─── */}
          {boostStep === "paid" && (
            <div className="p-6 space-y-4 text-center">
              <div className="size-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-black text-lg text-foreground">Destaque Ativado!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Seu anúncio agora aparece com prioridade no topo das buscas.
                  <br />O destaque foi confirmado após o pagamento.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleCloseBoostModal}
                className="w-full rounded-xl text-xs h-11 font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer"
              >
                Concluído
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Migração de Anúncio para Loja no Workspace Pro */}
      <Dialog open={!!migratingAd} onOpenChange={(open) => !open && setMigratingAd(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
              <Building2 className="size-6" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Migrar para o Workspace Pro
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Transforme o anúncio <strong>"{migratingAd?.title}"</strong> em uma empresa oficial no ecossistema Waesy com painel de gestão completo.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Painel de gestão, pedidos e catálogo</span>
            </div>
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Telemetria do ponto físico e rotatividade mantidas</span>
            </div>
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>50.000 tokens de IA inclusos na carteira</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMigratingAd(null)}
              className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleMigrateToPro}
              disabled={isMigrating}
              className="flex-1 h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground cursor-pointer shadow-xs"
            >
              {isMigrating ? <Loader2 className="size-4 animate-spin mr-1" /> : <Sparkles className="size-4 mr-1" />}
              <span>Confirmar Migração</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
