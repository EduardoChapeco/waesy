import { cn } from '@/lib/utils';
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
  Zap,
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
  MoreVertical,
  MousePointer,
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
import { NativeMobileHeader } from "@/components/navigation";
import { BoostBottomSheet } from "@/components/commerce/boost-bottom-sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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


// ─── Ad-Tech: Mini-Sparkline Monocromático 7 Dias (Design Silencioso) ─────────
function AdSparkline({ data, className = "h-7 w-20" }: { data: number[]; className?: string }) {
  const safeData = Array.isArray(data) && data.length >= 2 ? data : [0, 0, 0, 0, 0, 0, 0];
  const allZeros = safeData.every((v) => v === 0);
  const max = allZeros ? 1 : Math.max(...safeData);
  const min = 0;
  const range = max - min || 1;
  const width = 100;
  const height = 28;
  const points = safeData.map((val, idx) => {
    const x = (idx / (safeData.length - 1)) * width;
    const y = allZeros
      ? height - 4
      : height - ((val - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;

  return (
    <div className={cn("relative flex items-center shrink-0", className)} title="Tendência de acessos nos últimos 7 dias">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth={allZeros ? "1" : "2"}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={allZeros ? "text-muted-foreground/30 stroke-dashed" : "text-primary/75"}
        />
        {!allZeros && points.length > 0 && (
          <circle
            cx={points[points.length - 1].split(",")[0]}
            cy={points[points.length - 1].split(",")[1]}
            r="2.5"
            className="fill-primary"
          />
        )}
      </svg>
    </div>
  );
}


export const Route = createFileRoute("/_store/conta/classificados/")({
  head: () => ({ meta: [{ title: "Meus Anúncios | Waesy" }] }),
  errorComponent: ContaClassificadosErrorComponent,
  component: ClassificadosIndex,
});

function ContaClassificadosErrorComponent({ error }: { error: any }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-5">
      <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-1">
        <Tag className="size-8" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-bold text-foreground">Falha ao Carregar Seus Anúncios</h1>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Não foi possível sincronizar sua lista de anúncios gerenciados no momento.
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
          className="rounded-xl text-xs h-11 px-5 font-bold cursor-pointer"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-3.5 mr-1.5" />
          <span>Tentar Novamente</span>
        </Button>
      </div>
    </div>
  );
}

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
  expired: { label: "Expirado", className: "border-border/60 bg-muted/40 text-muted-foreground" },
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
            {/* ── 1. NativeMobileHeader Canônico ── */}
      <NativeMobileHeader
        fallbackHref="/conta"
        title="Meus Anúncios"
        badge={
          (classifieds || []).length > 0 ? (
            <Badge variant="outline" className="text-xs font-mono font-bold bg-muted/30">
              {(classifieds || []).length}
            </Badge>
          ) : null
        }
        rightActions={
          <Button asChild size="sm" className="h-8.5 px-3 rounded-xl font-bold gap-1.5 bg-primary text-primary-foreground">
            <Link to="/conta/classificados/novo">
              <Plus className="size-4" />
              <span>Criar</span>
            </Link>
          </Button>
        }
      />

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
            className="h-11 sm:h-9 rounded-xl text-base sm:text-xs bg-background border-border/70"
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
        <>
          {/* ── BIFURCAÇÃO MOBILE: Padrão WhatsApp List Edge-to-Edge ── */}
          <div className="block md:hidden w-full bg-card divide-y divide-border/40 border-y border-border/40 overflow-hidden">
            {filtered.map((ad: any) => {
              const statusConf = STATUS_CONFIG[ad.status] || STATUS_CONFIG.draft;
              const isBoosted = ad.is_boosted && ad.boosted_until && new Date(ad.boosted_until) > new Date();
              const isPaused = ad.status === "paused";
              const thumbUrl = ad.images?.[0] || null;
              const isVideo = isVideoUrl(thumbUrl);
              const niche = resolveClassifiedNiche(ad);
              const NicheIcon = niche.icon;
              const viewsCount = ad.views_count || 0;
              const clicksCount = ad.clicks_count || 0;
              const whatsappCount = ad.whatsapp_clicks_count || ad.proposals_count || 0;

              return (
                <div key={ad.id} className="p-3.5 space-y-2.5 transition-colors hover:bg-muted/20">
                  {/* Linha Superior: Foto à esquerda + Infos à direita */}
                  <div className="flex items-start gap-3">
                    {/* Thumbnail Squircle */}
                    <div className="size-16 rounded-xl bg-muted shrink-0 overflow-hidden border border-border/40 flex items-center justify-center relative">
                      {thumbUrl ? (
                        isVideo ? (
                          <video src={thumbUrl} className="size-full object-cover" muted />
                        ) : (
                          <img src={thumbUrl} alt={ad.title} className="size-full object-cover" />
                        )
                      ) : (
                        <ImageIcon className="size-6 text-muted-foreground/40" />
                      )}
                      {isBoosted && (
                        <span className="absolute top-1 left-1 size-2 rounded-full bg-amber-500 animate-pulse" />
                      )}
                    </div>

                    {/* Título, Preço e Status */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <h2 className="text-xs font-bold text-foreground truncate leading-snug">
                          {ad.title}
                        </h2>
                        <div className="flex items-center gap-1 shrink-0">
                          {isBoosted && (
                            <Badge className="text-[8px] font-mono px-1 py-0 h-3.5 bg-amber-500 text-black border-none font-black">
                              BOOST
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn("text-[8px] font-mono px-1 py-0 h-3.5", statusConf.className)}>
                            {statusConf.label}
                          </Badge>
                        </div>
                      </div>

                      {ad.price_cents != null && (
                        <p className="text-sm font-black font-mono text-foreground">
                          {formatMoney(ad.price_cents)}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5 truncate">
                          <NicheIcon className="size-2.5 shrink-0 text-muted-foreground/70" />
                          {niche.shortLabel}
                        </span>
                        {ad.location_city && (
                          <>
                            <span>•</span>
                            <span className="truncate">{ad.location_city}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Linha Inferior: Micro-Pills Silenciosas + Ações Diretas */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {/* Micro-Pills de Performance */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border border-border/40 text-[10px] font-mono text-muted-foreground" title="Visualizações">
                        <Eye className="size-2.5" />
                        <span>{viewsCount}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border border-border/40 text-[10px] font-mono text-muted-foreground" title="Cliques">
                        <MousePointer className="size-2.5 text-sky-600 dark:text-sky-400" />
                        <span>{clicksCount}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border border-border/40 text-[10px] font-mono text-muted-foreground" title="Contatos WhatsApp">
                        <MessageCircle className="size-2.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{whatsappCount}</span>
                      </span>

                      {viewsCount > 0 && (
                        <div className="hidden xs:flex items-center pl-1 border-l border-border/40" title="Tendência 7 dias">
                          <AdSparkline data={ad.sparkline_7d || [0, 0, 0, 0, 0, 0, 0]} className="h-5 w-12" />
                        </div>
                      )}
                    </div>

                    {/* Ação Primária: Impulsionar + Menu Contextual (3 pontos) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenBoostModal(ad)}
                        disabled={!gatewayAvailable || gatewayLoading}
                        className={cn(
                          "h-9 px-3 rounded-xl font-bold text-xs gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs",
                          !gatewayAvailable
                            ? "bg-muted text-muted-foreground border border-border/50 cursor-not-allowed opacity-60"
                            : isBoosted
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                            : "bg-amber-500 text-black hover:bg-amber-400"
                        )}
                      >
                        <Zap className="size-3 fill-current" />
                        <span>{isBoosted ? "Renovar" : "Impulsionar"}</span>
                      </Button>

                      {/* Dropdown de Ações Secundárias (Anti-Esmagamento Apple HIG) */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                            aria-label="Mais opções"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 border-border/80">
                          <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2">
                            <Link to="/conta/classificados/novo" search={{ editId: ad.id }}>
                              <Edit3 className="size-3.5 mr-2 text-muted-foreground" />
                              <span>Editar Anúncio</span>
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2">
                            <Link to="/classificados/$id" params={{ id: ad.id }}>
                              <ExternalLink className="size-3.5 mr-2 text-muted-foreground" />
                              <span>Ver na Vitrine</span>
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: ad.id,
                                newStatus: isPaused ? "active" : "paused",
                              })
                            }
                            disabled={toggleStatusMutation.isPending}
                            className="rounded-xl cursor-pointer text-xs font-semibold py-2"
                          >
                            {isPaused ? (
                              <>
                                <PlayCircle className="size-3.5 mr-2 text-emerald-600" />
                                <span>Reativar Anúncio</span>
                              </>
                            ) : (
                              <>
                                <PauseCircle className="size-3.5 mr-2 text-amber-600" />
                                <span>Pausar Anúncio</span>
                              </>
                            )}
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {ad.store_id ? (
                            <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2 text-primary">
                              <Link to="/workspace">
                                <Building2 className="size-3.5 mr-2" />
                                <span>Acessar Loja Pro</span>
                              </Link>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setMigratingAd(ad)}
                              className="rounded-xl cursor-pointer text-xs font-semibold py-2 text-primary"
                            >
                              <Sparkles className="size-3.5 mr-2" />
                              <span>Migrar para Loja Pro</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── BIFURCAÇÃO DESKTOP: Bento Grid com Sparklines Silenciosos ── */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((ad: any) => {
              const statusConf = STATUS_CONFIG[ad.status] || STATUS_CONFIG.draft;
              const isBoosted = ad.is_boosted && ad.boosted_until && new Date(ad.boosted_until) > new Date();
              const isPaused = ad.status === "paused";
              const thumbUrl = ad.images?.[0] || null;
              const isVideo = isVideoUrl(thumbUrl);
              const niche = resolveClassifiedNiche(ad);
              const NicheIcon = niche.icon;
              const viewsCount = ad.views_count || 0;
              const clicksCount = ad.clicks_count || 0;
              const whatsappCount = ad.whatsapp_clicks_count || ad.proposals_count || 0;
              const sparklinePoints = (ad.sparkline_7d && Array.isArray(ad.sparkline_7d) && ad.sparkline_7d.length >= 2)
                ? ad.sparkline_7d
                : [0, 0, 0, 0, 0, 0, 0];

              return (
                <div
                  key={ad.id}
                  className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col justify-between hover:border-border transition-all shadow-xs group"
                >
                  <div className="p-3.5 space-y-3">
                    {/* Imagem / Capa Panorâmica */}
                    <div className="h-36 w-full rounded-xl bg-muted overflow-hidden border border-border/40 relative flex items-center justify-center">
                      {thumbUrl ? (
                        isVideo ? (
                          <video src={thumbUrl} className="size-full object-cover" muted />
                        ) : (
                          <img src={thumbUrl} alt={ad.title} className="size-full object-cover group-hover:scale-102 transition-transform duration-300" />
                        )
                      ) : (
                        <ImageIcon className="size-8 text-muted-foreground/30" />
                      )}

                      {/* Badges Flutuantes */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <Badge variant="outline" className={cn("text-[9px] font-mono px-2 py-0.5 backdrop-blur-md bg-background/90 shadow-2xs", statusConf.className)}>
                          {statusConf.label}
                        </Badge>
                        {isBoosted && (
                          <Badge className="text-[9px] font-mono px-2 py-0.5 bg-amber-500 text-black border-none font-black shadow-xs gap-1">
                            <Zap className="size-2.5 fill-current" />
                            DESTAQUE
                          </Badge>
                        )}
                      </div>

                      {/* Sparkline no Canto Inferior Direito da Imagem */}
                      {viewsCount > 0 && (
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-background/90 backdrop-blur-md border border-border/50 flex items-center gap-2 shadow-2xs">
                          <span className="text-[9px] font-mono text-muted-foreground font-semibold">7d</span>
                          <AdSparkline data={sparklinePoints} />
                        </div>
                      )}
                    </div>

                    {/* Metadados do Anúncio */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 uppercase tracking-wider">
                          <NicheIcon className="size-3 text-muted-foreground/70" />
                          {niche.shortLabel}
                        </span>
                        {ad.location_city && (
                          <span className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                            <MapPin className="size-2.5" />
                            {ad.location_city}
                          </span>
                        )}
                      </div>

                      <h2 className="text-sm font-bold text-foreground line-clamp-1 leading-snug group-hover:text-primary transition-colors">
                        {ad.title}
                      </h2>

                      {ad.price_cents != null && (
                        <p className="text-base font-black font-mono text-foreground pt-0.5">
                          {formatMoney(ad.price_cents)}
                        </p>
                      )}
                    </div>

                    {/* Micro-Pills Silenciosas de Métricas */}
                    <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/40 text-[11px] font-mono text-muted-foreground" title="Visualizações">
                        <Eye className="size-3" />
                        <span>{viewsCount}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/40 text-[11px] font-mono text-muted-foreground" title="Cliques">
                        <MousePointer className="size-3 text-sky-600 dark:text-sky-400" />
                        <span>{clicksCount}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/40 text-[11px] font-mono text-muted-foreground" title="Contatos WhatsApp">
                        <MessageCircle className="size-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{whatsappCount}</span>
                      </span>
                    </div>
                  </div>

                  {/* Barra de Ações Inferior no Desktop */}
                  <div className="border-t border-border/40 bg-muted/10 px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenBoostModal(ad)}
                      disabled={!gatewayAvailable || gatewayLoading}
                      className={cn(
                        "h-9 px-3.5 rounded-xl font-bold text-xs gap-1.5 cursor-pointer flex-1 transition-all active:scale-95 shadow-2xs",
                        !gatewayAvailable
                          ? "bg-muted text-muted-foreground border border-border/50 cursor-not-allowed opacity-60"
                          : isBoosted
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                          : "bg-amber-500 text-black hover:bg-amber-400"
                      )}
                    >
                      <Zap className="size-3.5 fill-current" />
                      <span>{isBoosted ? "Renovar Destaque" : "Impulsionar Anúncio"}</span>
                    </Button>

                    {/* Dropdown de Ações Secundárias */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-9 rounded-xl border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5 border-border/80">
                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2">
                          <Link to="/conta/classificados/novo" search={{ editId: ad.id }}>
                            <Edit3 className="size-3.5 mr-2 text-muted-foreground" />
                            <span>Editar Anúncio</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2">
                          <Link to="/classificados/$id" params={{ id: ad.id }}>
                            <ExternalLink className="size-3.5 mr-2 text-muted-foreground" />
                            <span>Ver na Vitrine</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: ad.id,
                              newStatus: isPaused ? "active" : "paused",
                            })
                          }
                          disabled={toggleStatusMutation.isPending}
                          className="rounded-xl cursor-pointer text-xs font-semibold py-2"
                        >
                          {isPaused ? (
                            <>
                              <PlayCircle className="size-3.5 mr-2 text-emerald-600" />
                              <span>Reativar Anúncio</span>
                            </>
                          ) : (
                            <>
                              <PauseCircle className="size-3.5 mr-2 text-amber-600" />
                              <span>Pausar Anúncio</span>
                            </>
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {ad.store_id ? (
                          <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2 text-primary">
                            <Link to="/workspace">
                              <Building2 className="size-3.5 mr-2" />
                              <span>Acessar Loja Pro</span>
                            </Link>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setMigratingAd(ad)}
                            className="rounded-xl cursor-pointer text-xs font-semibold py-2 text-primary"
                          >
                            <Sparkles className="size-3.5 mr-2" />
                            <span>Migrar para Loja Pro</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="w-full rounded-2xl border border-border/60 bg-card p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">
            {searchTerm ? "Nenhum anúncio encontrado para sua busca" : "Você ainda não possui anúncios ativos"}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchTerm
              ? "Tente buscar por outro termo ou limpe o campo de busca."
              : "Publique produtos, veículos, imóveis ou serviços para alcançar milhares de pessoas na sua cidade."}
          </p>
          <div className="pt-2">
            <Button asChild className="rounded-xl text-xs font-bold h-9 bg-primary text-primary-foreground">
              <Link to="/conta/classificados/novo">
                <Plus className="size-4 mr-1.5" />
                <span>Criar Primeiro Anúncio</span>
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* ── BOOST BOTTOM SHEET CANÔNICO (MOBILE & DESKTOP SPATIAL UI) ── */}
      <BoostBottomSheet
        open={!!boostingAd}
        onOpenChange={(open) => {
          if (!open) handleCloseBoostModal();
        }}
        targetItem={
          boostingAd
            ? {
                id: boostingAd.id,
                title: boostingAd.title,
                priceCents: boostingAd.price_cents,
                imageUrl: boostingAd.images?.[0] || boostingAd.image_url,
                category: boostingAd.category,
                locationCity: boostingAd.location_city,
              }
            : null
        }
        onConfirmBoost={async (planDays) => {
          if (!boostingAd) return;
          setSelectedPlan(planDays);
          await initiateBoostMutation.mutateAsync({ adId: boostingAd.id, planDays });
        }}
        isLoading={initiateBoostMutation.isPending}
        paymentResult={
          boostStep === "checkout_pending" && activeBoostPayment
            ? {
                pixQrCode: activeBoostPayment.pixQrCode,
                pixCopyPaste: activeBoostPayment.pixCopyPaste,
                paymentLink: activeBoostPayment.paymentLink,
                provider: activeBoostPayment.provider,
              }
            : null
        }
        onResetPayment={() => {
          setActiveBoostPayment(null);
          setBoostStep("plan_select");
        }}
      />

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
