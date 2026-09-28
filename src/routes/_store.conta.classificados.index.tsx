import { cn } from '@/lib/utils';
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  Plus,
  Loader2,
  Eye,
  Edit3,
  Image as ImageIcon,
  Zap,
  MessageCircle,
  PauseCircle,
  PlayCircle,
  Check,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building2,
  Star,
  MoreVertical,
  MousePointer,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getClassifieds,
  updateClassifiedStatus,
  getBoostPaymentStatus,
  initiateBoostPayment,
  getBoostPaymentById,
  convertClassifiedToWorkspaceStore,
  deleteClassified,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
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

type BoostStep = "plan_select" | "checkout_pending" | "paid";

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
  const [, setSelectedPlan] = useState<7 | 15 | 30>(15);
  const [boostStep, setBoostStep] = useState<BoostStep>("plan_select");
  const [activeBoostPayment, setActiveBoostPayment] = useState<ActiveBoostPayment | null>(null);

  // Estados de Gerenciamento & Exclusão E2E
  const [migratingAd, setMigratingAd] = useState<any | null>(null);
  const [adToDelete, setAdToDelete] = useState<any | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Filtros
  const [isMlFilterOpen, setIsMlFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteClassified({ data: id });
    },
    onSuccess: () => {
      toast.success("Anúncio excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["classifieds"] });
      setAdToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir anúncio.");
    },
  });

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

  // Gateway de Pagamento
  const { data: gatewayStatus, isLoading: gatewayLoading } = useQuery({
    queryKey: ["boost-gateway-status"],
    queryFn: () => getBoostPaymentStatus(),
    staleTime: 60_000,
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
      toast.error(err.message || "Erro ao atualizar status do anúncio.");
    },
  });

  const initiateBoostMutation = useMutation({
    mutationFn: async ({ adId, planDays }: { adId: string; planDays: 7 | 15 | 30 }) => {
      return await initiateBoostPayment({ data: { adId, planDays } });
    },
    onSuccess: (data) => {
      setActiveBoostPayment({
        boostPaymentId: data.boostPaymentId,
        provider: data.provider,
        pixQrCode: data.pixQrCode || null,
        pixCopyPaste: data.pixCopyPaste || null,
        paymentLink: data.paymentLink || null,
        amountCents: data.amountCents,
        planName: data.planName,
        planDays: data.planDays,
        expiresAt: data.expiresAt,
        adTitle: boostingAd?.title || "",
      });
      setBoostStep("checkout_pending");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao iniciar impulsionamento.");
    },
  });

  const checkPaymentStatus = useCallback(async () => {
    if (!activeBoostPayment?.boostPaymentId) return;
    try {
      const res = await getBoostPaymentById({ data: { boostPaymentId: activeBoostPayment.boostPaymentId } });
      if (res.status === "paid") {
        setBoostStep("paid");
        toast.success("Pagamento confirmado! O anúncio agora está em Destaque.");
        queryClient.invalidateQueries({ queryKey: ["classifieds"] });
      }
    } catch {
      // Polling silencioso
    }
  }, [activeBoostPayment, queryClient]);

  // Polling de pagamento quando pendente
  useQuery({
    queryKey: ["boost-poll", activeBoostPayment?.boostPaymentId],
    queryFn: async () => {
      await checkPaymentStatus();
      return true;
    },
    enabled: boostStep === "checkout_pending" && !!activeBoostPayment?.boostPaymentId,
    refetchInterval: 3000,
  });

  const handleOpenBoostModal = (ad: any) => {
    setBoostingAd(ad);
    setBoostStep("plan_select");
    setActiveBoostPayment(null);
  };

  const handleCloseBoostModal = () => {
    setBoostingAd(null);
    setBoostStep("plan_select");
    setActiveBoostPayment(null);
  };

  const safeClassifieds = Array.isArray(classifieds) ? classifieds : [];

  const filtered = safeClassifieds.filter((ad: any) => {
    if (statusFilter !== "all") {
      if (statusFilter === "boosted") {
        const isBoosted = ad.is_boosted && ad.boosted_until && new Date(ad.boosted_until) > new Date();
        if (!isBoosted) return false;
      } else if (ad.status !== statusFilter) {
        return false;
      }
    }
    if (categoryFilter !== "all" && ad.category !== categoryFilter) {
      return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      ad.title?.toLowerCase().includes(term) ||
      ad.description?.toLowerCase().includes(term) ||
      ad.category?.toLowerCase().includes(term)
    );
  });

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0);
  const gatewayAvailable = gatewayStatus?.available ?? false;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-28 px-0 sm:px-4 md:px-0">
      {/* ── 1. CABEÇALHO NATIVO UNIVERSAL (Voltar | Título | Lupa + Filtro ML) ── */}
      <NativeMobileHeader
        fallbackHref="/conta"
        title="Meus Anúncios"
        centerTitle={true}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar anúncio..."
        onFilterClick={() => setIsMlFilterOpen(true)}
        activeFiltersCount={activeFiltersCount}
        badge={
          safeClassifieds.length > 0 ? (
            <Badge variant="outline" className="text-xs font-mono font-bold bg-muted/30">
              {safeClassifieds.length}
            </Badge>
          ) : null
        }
        rightActions={
          <Button
            asChild
            size="sm"
            className="hidden sm:inline-flex h-11 px-4 rounded-xl font-bold gap-1.5 bg-primary text-primary-foreground"
          >
            <Link to="/conta/classificados/novo">
              <Plus className="size-4" />
              <span>Novo Anúncio</span>
            </Link>
          </Button>
        }
      />

      {/* ── Aviso Gateway ── */}
      {!gatewayLoading && !gatewayAvailable && (
        <div className="mx-4 sm:mx-0 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Impulsionamento indisponível.</span> Nenhum gateway de pagamento está configurado na plataforma.
          </div>
        </div>
      )}

      {/* ── 2. BIFURCAÇÃO NATIVA: Mobile (<640px WhatsApp List) vs Desktop (>=640px Bento Cards) ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="size-6 animate-spin" />
          <span className="text-xs">Sincronizando seus anúncios e telemetria...</span>
        </div>
      ) : filtered.length > 0 ? (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              MOBILE VIEW: WhatsApp List Edge-to-Edge (<640px)
              Zero-Dead-Space Mandate: se estende de ponta a ponta sem margem dupla
          ══════════════════════════════════════════════════════════════════ */}
          <div className="block sm:hidden border-y border-border/40 divide-y divide-border/40 bg-card">
            {filtered.map((ad: any) => {
              const statusConf = STATUS_CONFIG[ad.status] || STATUS_CONFIG.draft;
              const isBoosted = ad.is_boosted && ad.boosted_until && new Date(ad.boosted_until) > new Date();
              const isPaused = ad.status === "paused";
              const thumbUrl = ad.images?.[0] || null;
              const isVideo = isVideoUrl(thumbUrl);
              const niche = resolveClassifiedNiche(ad);
              const viewsCount = Number(ad.views_count || 0);
              const clicksCount = Number(ad.clicks_count || 0);
              const whatsappCount = Number(ad.whatsapp_clicks_count || ad.proposals_count || 0);

              return (
                <div
                  key={ad.id}
                  className="flex items-center justify-between p-3.5 gap-3 hover:bg-muted/20 active:bg-muted/40 transition-colors"
                >
                  {/* Thumbnail Quadrada Edge com Aspect 1:1 */}
                  <Link
                    to="/classificados/$id"
                    params={{ id: ad.id }}
                    className="relative size-16 shrink-0 rounded-xl overflow-hidden bg-muted flex items-center justify-center"
                  >
                    {thumbUrl ? (
                      isVideo ? (
                        <video src={thumbUrl} className="size-full object-cover" muted />
                      ) : (
                        <img src={thumbUrl} alt={ad.title} loading="lazy" className="size-full object-cover" />
                      )
                    ) : (
                      <ImageIcon className="size-6 text-muted-foreground/35" />
                    )}
                    {isBoosted && (
                      <span className="absolute top-1 left-1 px-1 py-0.2 rounded bg-amber-500 text-black text-[8px] font-black uppercase">
                        Boost
                      </span>
                    )}
                  </Link>

                  {/* Conteúdo Central */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to="/classificados/$id"
                        params={{ id: ad.id }}
                        className="text-xs font-bold text-foreground truncate hover:text-primary transition-colors flex-1"
                      >
                        {ad.title}
                      </Link>
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] font-mono px-1.5 py-0 shrink-0", statusConf.className)}
                      >
                        {statusConf.label}
                      </Badge>
                    </div>

                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-xs font-bold font-mono text-foreground">
                        {ad.price_cents != null ? (ad.price_cents === 0 ? "Doação" : formatMoney(ad.price_cents)) : "—"}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize truncate">
                        {niche.shortLabel}
                      </span>
                    </div>

                    {/* Telemetria Compacta */}
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                      <span className="flex items-center gap-0.5" title="Visualizações">
                        <Eye className="size-2.5" />
                        <span>{viewsCount}</span>
                      </span>
                      <span className="flex items-center gap-0.5 text-sky-600 dark:text-sky-400" title="Cliques">
                        <MousePointer className="size-2.5" />
                        <span>{clicksCount}</span>
                      </span>
                      <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400" title="Contatos">
                        <MessageCircle className="size-2.5" />
                        <span>{whatsappCount}</span>
                      </span>
                    </div>
                  </div>

                  {/* Ações Mobile 44x44px */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => handleOpenBoostModal(ad)}
                      disabled={!gatewayAvailable || gatewayLoading}
                      className={cn(
                        "size-10 min-w-[40px] rounded-xl cursor-pointer transition-all active:scale-95 shadow-none",
                        !gatewayAvailable
                          ? "bg-muted text-muted-foreground opacity-50"
                          : isBoosted
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                          : "bg-amber-500 text-black hover:bg-amber-400"
                      )}
                      title={isBoosted ? "Renovar Destaque" : "Impulsionar"}
                    >
                      <Zap className="size-4 fill-current" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10 min-w-[40px] rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 border-border/80">
                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2.5">
                          <Link to="/conta/classificados/novo" search={{ editId: ad.id }}>
                            <Edit3 className="size-4 mr-2 text-muted-foreground" />
                            <span>Editar Anúncio</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2.5">
                          <Link to="/classificados/$id" params={{ id: ad.id }}>
                            <ExternalLink className="size-4 mr-2 text-muted-foreground" />
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
                          className="rounded-xl cursor-pointer text-xs font-semibold py-2.5"
                        >
                          {isPaused ? (
                            <>
                              <PlayCircle className="size-4 mr-2 text-emerald-600" />
                              <span>Reativar Anúncio</span>
                            </>
                          ) : (
                            <>
                              <PauseCircle className="size-4 mr-2 text-amber-600" />
                              <span>Pausar Anúncio</span>
                            </>
                          )}
                        </DropdownMenuItem>

                        {ad.status !== "completed" && (
                          <DropdownMenuItem
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: ad.id,
                                newStatus: "completed" as any,
                              })
                            }
                            disabled={toggleStatusMutation.isPending}
                            className="rounded-xl cursor-pointer text-xs font-semibold py-2.5 text-blue-600 dark:text-blue-400"
                          >
                            <CheckCircle2 className="size-4 mr-2" />
                            <span>Marcar como Vendido</span>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() => setAdToDelete(ad)}
                          className="rounded-xl cursor-pointer text-xs font-semibold py-2.5 text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" />
                          <span>Excluir Anúncio</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {ad.store_id ? (
                          <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2.5 text-primary">
                            <Link to="/workspace">
                              <Building2 className="size-4 mr-2" />
                              <span>Acessar Loja Pro</span>
                            </Link>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => setMigratingAd(ad)}
                            className="rounded-xl cursor-pointer text-xs font-semibold py-2.5 text-primary"
                          >
                            <Star className="size-4 mr-2" />
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

          {/* ══════════════════════════════════════════════════════════════════
              DESKTOP VIEW: High-Density Bento Cards (>=640px)
          ══════════════════════════════════════════════════════════════════ */}
          <div className="hidden sm:block space-y-3.5">
            {filtered.map((ad: any) => {
              const statusConf = STATUS_CONFIG[ad.status] || STATUS_CONFIG.draft;
              const isBoosted = ad.is_boosted && ad.boosted_until && new Date(ad.boosted_until) > new Date();
              const isPaused = ad.status === "paused";
              const thumbUrl = ad.images?.[0] || null;
              const isVideo = isVideoUrl(thumbUrl);
              const niche = resolveClassifiedNiche(ad);
              const NicheIcon = niche.icon;
              const viewsCount = Number(ad.views_count || 0);
              const clicksCount = Number(ad.clicks_count || 0);
              const whatsappCount = Number(ad.whatsapp_clicks_count || ad.proposals_count || 0);

              return (
                <article
                  key={ad.id}
                  className="relative overflow-hidden rounded-2xl border border-border/60 bg-card min-h-[144px] pl-36 sm:pl-44 transition-all hover:border-primary/40 shadow-xs"
                >
                  <Link
                    to="/classificados/$id"
                    params={{ id: ad.id }}
                    className="absolute inset-y-0 left-0 w-36 sm:w-44 overflow-hidden rounded-l-2xl bg-muted flex items-center justify-center group"
                  >
                    {thumbUrl ? (
                      isVideo ? (
                        <video src={thumbUrl} className="size-full object-cover group-hover:scale-105 transition-transform duration-300" muted />
                      ) : (
                        <img src={thumbUrl} alt={ad.title} loading="lazy" className="size-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      )
                    ) : (
                      <ImageIcon className="size-8 text-muted-foreground/35" />
                    )}
                    {isBoosted && (
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider shadow-xs">
                        Boost
                      </span>
                    )}
                  </Link>

                  <div className="p-4 sm:p-5 flex flex-col justify-between min-h-[144px] gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to="/classificados/$id"
                          params={{ id: ad.id }}
                          className="text-sm sm:text-base font-bold text-foreground line-clamp-1 hover:text-primary transition-colors"
                        >
                          {ad.title}
                        </Link>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-mono px-2 py-0.5 shrink-0", statusConf.className)}
                        >
                          {statusConf.label}
                        </Badge>
                      </div>

                      {ad.price_cents != null && (
                        <p className="text-base sm:text-lg font-black font-mono text-foreground tracking-tight">
                          {ad.price_cents === 0 ? "Doação Gratuita" : formatMoney(ad.price_cents)}
                        </p>
                      )}

                      <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <NicheIcon className="size-3.5 text-muted-foreground/75" />
                          <span>{niche.shortLabel}</span>
                        </span>
                        {(ad.location_city || ad.location_name) && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[160px]">
                              {ad.location_city || ad.location_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border/40 text-[11px] font-mono text-muted-foreground"
                          title="Visualizações reais auditadas"
                        >
                          <Eye className="size-3" />
                          <span>{viewsCount}</span>
                        </span>

                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border/40 text-[11px] font-mono text-muted-foreground"
                          title="Cliques no anúncio"
                        >
                          <MousePointer className="size-3 text-sky-600 dark:text-sky-400" />
                          <span>{clicksCount}</span>
                        </span>

                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border/40 text-[11px] font-mono text-muted-foreground"
                          title="Contatos WhatsApp e Propostas"
                        >
                          <MessageCircle className="size-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{whatsappCount}</span>
                        </span>

                        <div className="hidden sm:flex items-center pl-1 border-l border-border/40" title="Tendência 7 dias">
                          <AdSparkline data={ad.sparkline_7d || [0, 0, 0, 0, 0, 0, viewsCount]} className="h-6 w-14" />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          onClick={() => handleOpenBoostModal(ad)}
                          disabled={!gatewayAvailable || gatewayLoading}
                          className={cn(
                            "h-10 px-3.5 rounded-xl font-bold text-xs gap-1.5 cursor-pointer transition-all active:scale-95 shadow-none",
                            !gatewayAvailable
                              ? "bg-muted text-muted-foreground border border-border/50 cursor-not-allowed opacity-60"
                              : isBoosted
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20"
                              : "bg-amber-500 text-black hover:bg-amber-400"
                          )}
                        >
                          <Zap className="size-3.5 fill-current" />
                          <span>{isBoosted ? "Renovar" : "Impulsionar"}</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer"
                              aria-label="Opções do anúncio"
                            >
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 border-border/80">
                            <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2.5">
                              <Link to="/conta/classificados/novo" search={{ editId: ad.id }}>
                                <Edit3 className="size-4 mr-2 text-muted-foreground" />
                                <span>Editar Anúncio</span>
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2.5">
                              <Link to="/classificados/$id" params={{ id: ad.id }}>
                                <ExternalLink className="size-4 mr-2 text-muted-foreground" />
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
                              className="rounded-xl cursor-pointer text-xs font-semibold py-2.5"
                            >
                              {isPaused ? (
                                <>
                                  <PlayCircle className="size-4 mr-2 text-emerald-600" />
                                  <span>Reativar Anúncio</span>
                                </>
                              ) : (
                                <>
                                  <PauseCircle className="size-4 mr-2 text-amber-600" />
                                  <span>Pausar Anúncio</span>
                                </>
                              )}
                            </DropdownMenuItem>

                            {ad.status !== "completed" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: ad.id,
                                    newStatus: "completed" as any,
                                  })
                                }
                                disabled={toggleStatusMutation.isPending}
                                className="rounded-xl cursor-pointer text-xs font-semibold py-2.5 text-blue-600 dark:text-blue-400"
                              >
                                <CheckCircle2 className="size-4 mr-2" />
                                <span>Marcar como Vendido</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => setAdToDelete(ad)}
                              className="rounded-xl cursor-pointer text-xs font-semibold py-2.5 text-destructive"
                            >
                              <Trash2 className="size-4 mr-2" />
                              <span>Excluir Anúncio</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {ad.store_id ? (
                              <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-xs font-semibold py-2.5 text-primary">
                                <Link to="/workspace">
                                  <Building2 className="size-4 mr-2" />
                                  <span>Acessar Loja Pro</span>
                                </Link>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => setMigratingAd(ad)}
                                className="rounded-xl cursor-pointer text-xs font-semibold py-2.5 text-primary"
                              >
                                <Star className="size-4 mr-2" />
                                <span>Migrar para Loja Pro</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="mx-4 sm:mx-0 rounded-2xl border border-border/60 bg-card p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-foreground">
            {searchTerm ? "Nenhum anúncio encontrado para sua busca" : "Você ainda não possui anúncios ativos"}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchTerm
              ? "Tente buscar por outro termo ou ajuste os filtros."
              : "Use o botão + para publicar seu primeiro anúncio."}
          </p>
          <Button asChild size="sm" className="rounded-xl font-bold mt-2">
            <Link to="/conta/classificados/novo">
              <Plus className="size-4 mr-1.5" />
              <span>Publicar Anúncio</span>
            </Link>
          </Button>
        </div>
      )}

      {/* ── Mobile Floating Action Button (FAB 44px+) ── */}
      <Link
        to="/conta/classificados/novo"
        aria-label="Criar Novo Anúncio"
        className="sm:hidden fixed bottom-20 right-4 z-40 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="size-6" />
      </Link>

      {/* ── FILTRO SHEET CANÔNICO (100dvh no Mobile / Dialog no Desktop) ── */}
      <Sheet open={isMlFilterOpen} onOpenChange={setIsMlFilterOpen}>
        <SheetContent side="bottom" className="h-[90dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-md mx-auto rounded-t-3xl sm:rounded-2xl p-0 overflow-hidden flex flex-col">
          <SheetHeader className="p-4 border-b border-border/40 shrink-0 text-left flex flex-row items-center justify-between">
            <SheetTitle className="text-base font-bold text-foreground">
              Filtrar Anúncios
            </SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsMlFilterOpen(false)}
              className="size-9 rounded-full"
            >
              <Check className="size-4" />
            </Button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Status do Anúncio
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "all", label: "Todos os Status" },
                  { id: "active", label: "Publicados" },
                  { id: "paused", label: "Pausados" },
                  { id: "boosted", label: "Impulsionados" },
                  { id: "completed", label: "Finalizados" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={cn(
                      "h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer",
                      statusFilter === st.id
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border/60 bg-card text-foreground"
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                Categoria
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={cn(
                    "h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer",
                    categoryFilter === "all"
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border/60 bg-card text-foreground"
                  )}
                >
                  Todas
                </button>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategoryFilter(key)}
                    className={cn(
                      "h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer",
                      categoryFilter === key
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border/60 bg-card text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/40 shrink-0 flex items-center gap-2 bg-background">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStatusFilter("all");
                setCategoryFilter("all");
                setSearchTerm("");
                setIsMlFilterOpen(false);
              }}
              className="h-11 flex-1 rounded-xl font-bold text-xs"
            >
              Limpar
            </Button>
            <Button
              type="button"
              onClick={() => setIsMlFilterOpen(false)}
              className="h-11 flex-1 rounded-xl font-bold text-xs bg-primary text-primary-foreground"
            >
              Ver {filtered.length} Anúncio(s)
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── BOOST BOTTOM SHEET CANÔNICO ── */}
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

      {/* ── MODAL DE MIGRAÇÃO PARA LOJA PRO ── */}
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
              {isMigrating ? <Loader2 className="size-4 animate-spin mr-1" /> : <Star className="size-4 mr-1" />}
              <span>Confirmar Migração</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (CORREÇÃO DE GAP LÓGICO E2E) ── */}
      <Dialog open={!!adToDelete} onOpenChange={(open) => !open && setAdToDelete(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6 space-y-4">
          <DialogHeader>
            <div className="size-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-1">
              <Trash2 className="size-6" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Excluir Anúncio Definitivamente?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Você tem certeza de que deseja excluir <strong>"{adToDelete?.title}"</strong>? Esta ação é irreversível e removerá o anúncio e suas métricas da plataforma.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdToDelete(null)}
              disabled={deleteMutation.isPending}
              className="flex-1 h-10 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (adToDelete) {
                  deleteMutation.mutate(adToDelete.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="flex-1 h-10 rounded-xl text-xs font-bold cursor-pointer shadow-xs"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="size-4 mr-1" />
              )}
              <span>Excluir Anúncio</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// Default export removed for TanStack Router code-splitting optimization
export default Route.component;
