import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Gift,
  Trophy,
  Ticket,
  Users,
  Plus,
  Play,
  CheckCircle2,
  Clock,
  Award,
  Calendar,
  Layers,
  Loader2,
  ShieldCheck,
  Pencil,
  Trash2,
  Search,
  Store,
  Eye,
  Ban,
  Phone,
  User,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SheetPage } from "@/components/ui/sheet-page";
import { MediaUploader } from "@/components/ui/media-uploader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  adminListGamification,
  adminDrawRaffle,
  adminCancelRaffle,
  adminGetRaffleTickets,
  adminUpsertReward,
  adminDeleteReward,
  adminCreateRaffle,
} from "@/services/invite.functions";

export const Route = createFileRoute("/admin-master/convite")({
  head: () => ({ meta: [{ title: "Sorteios & Prêmios | Admin Master" }] }),
  loader: async () => {
    try {
      const data = await adminListGamification();
      return data;
    } catch (e: any) {
      console.error("[admin-master.convite] Loader error:", e);
      return {
        totalLinks: 0,
        totalConversions: 0,
        links: [],
        conversions: [],
        rewards: [],
        raffles: [],
      };
    }
  },
  component: AdminConvitePage,
});

function AdminConvitePage() {
  const data = Route.useLoaderData();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"sorteios" | "premios" | "conversoes">("sorteios");

  // Raffles state
  const [originFilter, setOriginFilter] = useState<"all" | "platform" | "store">("all");
  const [raffleSearch, setRaffleSearch] = useState("");
  const [drawingRaffleId, setDrawingRaffleId] = useState<string | null>(null);
  const [raffleToDraw, setRaffleToDraw] = useState<any | null>(null);

  // Tickets Audit Sheet
  const [selectedRaffleForTickets, setSelectedRaffleForTickets] = useState<any | null>(null);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);

  // New Raffle Sheet (spacious SheetPage, zero squished inputs)
  const [isRaffleSheetOpen, setIsRaffleSheetOpen] = useState(false);
  const [newRaffleTitle, setNewRaffleTitle] = useState("");
  const [newRaffleDesc, setNewRaffleDesc] = useState("");
  const [newRaffleTerms, setNewRaffleTerms] = useState("");
  const [newRaffleImg, setNewRaffleImg] = useState("");
  const [newRafflePoints, setNewRafflePoints] = useState(0);
  const [newRaffleMaxTickets, setNewRaffleMaxTickets] = useState(5);
  const [newRaffleDate, setNewRaffleDate] = useState("");
  const [isSavingRaffle, setIsSavingRaffle] = useState(false);

  // New / Edit Reward Modal
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [newRewardTitle, setNewRewardTitle] = useState("");
  const [newRewardDesc, setNewRewardDesc] = useState("");
  const [newRewardPoints, setNewRewardPoints] = useState(300);
  const [newRewardStock, setNewRewardStock] = useState<number | undefined>(10);
  const [newRewardType, setNewRewardType] = useState("ticket");
  const [newRewardActive, setNewRewardActive] = useState(true);
  const [isSavingReward, setIsSavingReward] = useState(false);

  // Filtered Raffles
  const filteredRaffles = useMemo(() => {
    return (data.raffles || []).filter((r: any) => {
      // Origin filter
      if (originFilter === "platform" && !r.is_official_platform && r.store_id) return false;
      if (originFilter === "store" && (r.is_official_platform || !r.store_id)) return false;

      // Text search
      if (raffleSearch.trim()) {
        const query = raffleSearch.toLowerCase();
        const titleMatch = r.title?.toLowerCase().includes(query);
        const storeMatch = r.storeName?.toLowerCase().includes(query);
        if (!titleMatch && !storeMatch) return false;
      }

      return true;
    });
  }, [data.raffles, originFilter, raffleSearch]);

  const openNewRewardModal = () => {
    setEditingRewardId(null);
    setNewRewardTitle("");
    setNewRewardDesc("");
    setNewRewardPoints(300);
    setNewRewardStock(10);
    setNewRewardType("ticket");
    setNewRewardActive(true);
    setIsRewardModalOpen(true);
  };

  const openEditRewardModal = (reward: any) => {
    setEditingRewardId(reward.id);
    setNewRewardTitle(reward.title);
    setNewRewardDesc(reward.description || "");
    setNewRewardPoints(reward.points_required);
    setNewRewardStock(reward.stock ?? undefined);
    setNewRewardType(reward.reward_type || "ticket");
    setNewRewardActive(reward.active ?? true);
    setIsRewardModalOpen(true);
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta recompensa do catálogo?")) return;
    try {
      await adminDeleteReward({ data: { rewardId } });
      toast.success("Recompensa excluída com sucesso.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao excluir recompensa.");
    }
  };

  const handleOpenTickets = async (raffle: any) => {
    setSelectedRaffleForTickets(raffle);
    setIsLoadingTickets(true);
    try {
      const tickets = await adminGetRaffleTickets({ data: { raffleId: raffle.id } });
      setTicketsList(tickets);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao carregar bilhetes.");
      setTicketsList([]);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleCancelRaffle = async (raffleId: string, raffleTitle: string) => {
    if (!confirm(`Deseja realmente cancelar o sorteio "${raffleTitle}"?`)) return;
    try {
      await adminCancelRaffle({ data: { raffleId } });
      toast.success("Sorteio cancelado com sucesso.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cancelar sorteio.");
    }
  };

  const confirmDrawRaffle = async () => {
    if (!raffleToDraw) return;

    setDrawingRaffleId(raffleToDraw.id);
    try {
      const res = await adminDrawRaffle({ data: { raffleId: raffleToDraw.id } });
      toast.success(
        `Apuração realizada! Cupom contemplado: #${res.ticketNumber} (${res.winnerName})`,
        { duration: 6000 }
      );
      setRaffleToDraw(null);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao realizar apuração do sorteio.");
    } finally {
      setDrawingRaffleId(null);
    }
  };

  const handleCreateRaffleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRaffleTitle.trim() || !newRaffleDate) {
      toast.error("Preencha título e data do sorteio.");
      return;
    }

    setIsSavingRaffle(true);
    try {
      await adminCreateRaffle({
        data: {
          title: newRaffleTitle.trim(),
          description: newRaffleDesc.trim() || undefined,
          imageUrl: newRaffleImg.trim() || undefined,
          termsText: newRaffleTerms.trim() || undefined,
          points_cost: newRafflePoints,
          draw_date: new Date(newRaffleDate).toISOString(),
          max_tickets_per_user: newRaffleMaxTickets,
        },
      });
      toast.success("Sorteio oficial cadastrado com sucesso.");
      setIsRaffleSheetOpen(false);
      setNewRaffleTitle("");
      setNewRaffleDesc("");
      setNewRaffleTerms("");
      setNewRaffleImg("");
      setNewRafflePoints(0);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar sorteio.");
    } finally {
      setIsSavingRaffle(false);
    }
  };

  const handleCreateRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRewardTitle.trim() || !newRewardPoints) {
      toast.error("Preencha título e pontos da recompensa.");
      return;
    }

    setIsSavingReward(true);
    try {
      await adminUpsertReward({
        data: {
          id: editingRewardId || undefined,
          title: newRewardTitle.trim(),
          description: newRewardDesc.trim() || undefined,
          points_required: newRewardPoints,
          stock: newRewardStock ?? null,
          reward_type: newRewardType,
          active: newRewardActive,
        },
      });
      toast.success(
        editingRewardId ? "Recompensa atualizada com sucesso." : "Recompensa cadastrada."
      );
      setIsRewardModalOpen(false);
      setEditingRewardId(null);
      setNewRewardTitle("");
      setNewRewardDesc("");
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar recompensa.");
    } finally {
      setIsSavingReward(false);
    }
  };

  const totalTicketsAll = (data.raffles || []).reduce((acc: number, r: any) => acc + (r.totalTickets || 0), 0);

  return (
    <div className="w-full space-y-6 pb-20 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* ── 1. CABEÇALHO OBJETIVO & ESTATÍSTICAS ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Sorteios & Prêmios
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Governança global de sorteios oficiais e de lojas, apuração eletrônica e catálogo de recompensas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <span className="text-xs font-mono text-muted-foreground uppercase block">Sorteios Cadastrados</span>
          <span className="text-2xl font-black font-mono text-foreground">{data.raffles.length}</span>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <span className="text-xs font-mono text-muted-foreground uppercase block">Cupons Emitidos</span>
          <span className="text-2xl font-black font-mono text-foreground">{totalTicketsAll}</span>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <span className="text-xs font-mono text-muted-foreground uppercase block">Prêmios Ativos</span>
          <span className="text-2xl font-black font-mono text-foreground">{data.rewards.length}</span>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <span className="text-xs font-mono text-muted-foreground uppercase block">Membros Indicados</span>
          <span className="text-2xl font-black font-mono text-foreground">{data.totalConversions}</span>
        </div>
      </div>

      {/* ── 2. NAVEGAÇÃO DE ABAS OBJETIVAS ── */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("sorteios")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === "sorteios"
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          Sorteios ({data.raffles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("premios")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === "premios"
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          Prêmios ({data.rewards.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("conversoes")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeTab === "conversoes"
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          Indicações ({data.conversions.length})
        </button>
      </div>

      {/* ── 3. ABA 1: SORTEIOS COM AUDITORIA E FILTRO DE ORIGEM ── */}
      {activeTab === "sorteios" && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={raffleSearch}
                  onChange={(e) => setRaffleSearch(e.target.value)}
                  placeholder="Buscar sorteio ou loja..."
                  className="pl-9 h-9 rounded-xl text-xs bg-card"
                />
              </div>

              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/70 text-xs">
                <button
                  type="button"
                  onClick={() => setOriginFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                    originFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setOriginFilter("platform")}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                    originFilter === "platform" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  Oficiais
                </button>
                <button
                  type="button"
                  onClick={() => setOriginFilter("store")}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                    originFilter === "store" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  Lojas
                </button>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setIsRaffleSheetOpen(true)}
              className="h-9 rounded-xl text-xs font-mono gap-1.5 shrink-0"
            >
              <Plus className="size-3.5" />
              <span>Novo Sorteio</span>
            </Button>
          </div>

          <div className="space-y-3">
            {filteredRaffles.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border/70">
                Nenhum sorteio encontrado com os filtros selecionados.
              </div>
            ) : (
              filteredRaffles.map((raffle: any) => {
                const isCompleted = raffle.status === "completed";
                const isCancelled = raffle.status === "cancelled";
                const isOfficial = raffle.is_official_platform || !raffle.store_id;

                return (
                  <div
                    key={raffle.id}
                    className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 max-w-2xl">
                      {raffle.image_url ? (
                        <div className="size-20 sm:size-24 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/60">
                          <img
                            src={raffle.image_url}
                            alt={raffle.title}
                            className="size-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="size-20 sm:size-24 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-center shrink-0">
                          <Ticket className="size-7 text-muted-foreground/50" />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={isCompleted ? "secondary" : isCancelled ? "destructive" : "default"}
                            className="font-mono text-[10px] uppercase"
                          >
                            {isCompleted ? "Concluído" : isCancelled ? "Cancelado" : "Ativo"}
                          </Badge>

                          <Badge variant="outline" className="font-mono text-[10px] gap-1">
                            {isOfficial ? (
                              <>
                                <ShieldCheck className="size-3 text-primary" />
                                <span>Waesy Oficial</span>
                              </>
                            ) : (
                              <>
                                <Store className="size-3 text-muted-foreground" />
                                <span>{raffle.storeName}</span>
                              </>
                            )}
                          </Badge>

                          <span className="text-xs font-mono text-muted-foreground">
                            Apuração: {new Date(raffle.draw_date).toLocaleDateString("pt-BR")}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-foreground leading-tight">
                          {raffle.title}
                        </h3>

                        {raffle.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {raffle.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground pt-1">
                          <span>Custo: {raffle.points_cost > 0 ? `${raffle.points_cost} pts` : "Gratuito"}</span>
                          <span>•</span>
                          <span>
                            Cupons: <strong>{raffle.totalTickets}</strong>
                          </span>
                          {raffle.winner_ticket_number && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-bold">
                                Ganhador: Cupom #{raffle.winner_ticket_number} ({raffle.winnerName || "Anônimo"})
                                {raffle.winnerPhone && ` • Tel: ${raffle.winnerPhone}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border/50">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTickets(raffle)}
                        className="h-9 rounded-xl text-xs font-mono gap-1.5"
                      >
                        <Eye className="size-3.5" />
                        <span>Ver Cupons ({raffle.totalTickets})</span>
                      </Button>

                      {!isCompleted && !isCancelled && (
                        <>
                          <Button
                            type="button"
                            disabled={drawingRaffleId === raffle.id || raffle.totalTickets === 0}
                            onClick={() => setRaffleToDraw(raffle)}
                            className="h-9 rounded-xl text-xs font-mono font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            {drawingRaffleId === raffle.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Play className="size-3.5" />
                            )}
                            <span>Apurar</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelRaffle(raffle.id, raffle.title)}
                            className="h-9 rounded-xl text-xs text-destructive hover:bg-destructive/10"
                          >
                            <Ban className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* ── 4. ABA 2: CATÁLOGO DE PRÊMIOS ── */}
      {activeTab === "premios" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              Recompensas resgatáveis pelos usuários com saldo de pontos.
            </span>
            <Button
              type="button"
              onClick={openNewRewardModal}
              className="h-9 rounded-xl text-xs font-mono gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Adicionar Prêmio</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.rewards.map((reward: any) => (
              <div
                key={reward.id}
                className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {reward.reward_type}
                    </Badge>
                    <span className="text-sm font-black font-mono text-foreground">
                      {reward.points_required} pts
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{reward.title}</h3>
                  {reward.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{reward.description}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-border/50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>Estoque: {reward.stock ?? "Ilimitado"}</span>
                    <Badge variant={reward.active ? "default" : "secondary"} className="text-[9px]">
                      {reward.active ? "Ativo" : "Pausado"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditRewardModal(reward)}
                      className="h-8 px-2.5 rounded-lg text-xs gap-1"
                    >
                      <Pencil className="size-3" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReward(reward.id)}
                      className="h-8 px-2.5 rounded-lg text-xs gap-1 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3" />
                      <span>Excluir</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 5. ABA 3: TELEMETRIA DE INDICAÇÕES ── */}
      {activeTab === "conversoes" && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
            <div className="divide-y divide-border/60">
              {data.conversions.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted-foreground">
                  Nenhuma indicação registrada até o momento.
                </div>
              ) : (
                data.conversions.map((conv: any) => (
                  <div key={conv.id} className="p-4 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground">
                        {conv.invited_profile?.full_name || "Membro Registrado"}
                      </span>
                      <span className="text-muted-foreground font-mono block text-[11px]">
                        Data: {new Date(conv.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-right space-y-0.5 font-mono">
                      <span className="text-emerald-600 font-bold">+{conv.points_awarded} pts</span>
                      <Badge variant="outline" className="text-[9px] block">
                        {conv.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── SHEET AUDITORIA DE CUPONS DO SORTEIO ── */}
      <SheetPage open={Boolean(selectedRaffleForTickets)} onOpenChange={(open) => { if (!open) setSelectedRaffleForTickets(null); }} title={`Cupons do Sorteio`} description={selectedRaffleForTickets?.title || "Auditoria de participantes e bilhetes emitidos."} size="default">
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between text-xs font-mono">
            <span>Total de Cupons: <strong>{ticketsList.length}</strong></span>
            <span>Apuração: {selectedRaffleForTickets?.draw_date ? new Date(selectedRaffleForTickets.draw_date).toLocaleDateString("pt-BR") : "—"}</span>
          </div>

          {isLoadingTickets ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Carregando cupons auditados...</span>
            </div>
          ) : ticketsList.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Nenhum cupom emitido para este sorteio ainda.
            </div>
          ) : (
            <div className="divide-y divide-border/60 border border-border/60 rounded-xl overflow-hidden bg-card">
              {ticketsList.map((t: any) => (
                <div key={t.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-foreground">
                        Cupom #{String(t.ticketNumber).padStart(4, "0")}
                      </span>
                      {selectedRaffleForTickets?.winner_ticket_number === t.ticketNumber && (
                        <Badge className="bg-emerald-600 text-white text-[9px] font-mono">
                          CONTEMPLADO
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        {t.userName}
                      </span>
                      {t.userPhone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="size-3" />
                          {t.userPhone}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetPage>

      {/* ── SHEET NOVO SORTEIO OFICIAL (ESPAÇOSO, ZERO SQUISHED INPUTS) ── */}
      <SheetPage open={isRaffleSheetOpen} onOpenChange={setIsRaffleSheetOpen} title="Novo Sorteio da Plataforma" description="Cadastre um sorteio oficial disponível para toda a Comunidade Waesy." size="lg">
        <form onSubmit={handleCreateRaffleSubmit} className="space-y-5 pt-2">
          {/* Media Uploader 16:9 */}
          <MediaUploader value={newRaffleImg} onChange={(urls) => setNewRaffleImg(urls[0] || "")}
            bucket="post-media"
            folder="raffles"
            aspect={16 / 9}
            label="Banner Oficial do Sorteio (16:9)"
          />

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Título do Sorteio *</Label>
            <Input
              value={newRaffleTitle}
              onChange={(e) => setNewRaffleTitle(e.target.value)}
              placeholder="Ex: Viagem de Fim de Semana com Hospedagem e Aéreos"
              className="h-10 rounded-xl text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Descrição do Prêmio</Label>
            <Textarea
              value={newRaffleDesc}
              onChange={(e) => setNewRaffleDesc(e.target.value)}
              placeholder="Descreva a experiência, prêmio e o que está incluso..."
              className="rounded-xl text-xs min-h-24"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Regulamento de Participação</Label>
            <Textarea
              value={newRaffleTerms}
              onChange={(e) => setNewRaffleTerms(e.target.value)}
              placeholder="Regras de elegibilidade, data da apuração e entrega do prêmio..."
              className="rounded-xl text-xs min-h-20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Data da Apuração *</Label>
              <Input
                type="date"
                value={newRaffleDate}
                onChange={(e) => setNewRaffleDate(e.target.value)}
                className="h-10 rounded-xl text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Custo em Pontos (0 = Grátis)</Label>
              <Input
                type="number"
                min={0}
                value={newRafflePoints}
                onChange={(e) => setNewRafflePoints(parseInt(e.target.value) || 0)}
                className="h-10 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Máximo por Membro</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={newRaffleMaxTickets}
                onChange={(e) => setNewRaffleMaxTickets(parseInt(e.target.value) || 1)}
                className="h-10 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRaffleSheetOpen(false)}
              className="h-10 rounded-xl text-xs px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSavingRaffle}
              className="h-10 rounded-xl text-xs font-mono font-bold px-5"
            >
              {isSavingRaffle ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Cadastrar Sorteio
            </Button>
          </div>
        </form>
      </SheetPage>

      {/* ── MODAL NOVO / EDITAR PRÊMIO ── */}
      <Dialog open={isRewardModalOpen} onOpenChange={setIsRewardModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingRewardId ? "Editar Recompensa" : "Nova Recompensa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRewardSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Título do Prêmio *</Label>
              <Input
                value={newRewardTitle}
                onChange={(e) => setNewRewardTitle(e.target.value)}
                placeholder="Ex: Ingresso Parque Temático"
                className="h-10 rounded-xl text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={newRewardDesc}
                onChange={(e) => setNewRewardDesc(e.target.value)}
                placeholder="Instruções de uso e validade..."
                className="rounded-xl text-xs min-h-20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Pontos Necessários *</Label>
                <Input
                  type="number"
                  value={newRewardPoints}
                  onChange={(e) => setNewRewardPoints(parseInt(e.target.value) || 0)}
                  className="h-10 rounded-xl text-xs font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estoque (Qtd)</Label>
                <Input
                  type="number"
                  value={newRewardStock ?? ""}
                  onChange={(e) => setNewRewardStock(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Vazio = Ilimitado"
                  className="h-10 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="reward-active-check"
                checked={newRewardActive}
                onChange={(e) => setNewRewardActive(e.target.checked)}
                className="rounded border-border size-4 accent-primary"
              />
              <Label htmlFor="reward-active-check" className="text-xs cursor-pointer select-none">
                Recompensa ativa para resgate imediato
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRewardModalOpen(false)}
                className="h-9 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingReward}
                className="h-9 rounded-xl text-xs font-mono font-bold"
              >
                {isSavingReward ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                {editingRewardId ? "Salvar Alterações" : "Cadastrar Prêmio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIÁLOGO DE APURAÇÃO DO SORTEIO (ZERO JARGÃO DE APOSTAS) ── */}
      <AlertDialog open={Boolean(raffleToDraw)} onOpenChange={(open) => { if (!open) setRaffleToDraw(null); }}>
        <AlertDialogContent className="max-w-md rounded-2xl p-6 border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">
              Realizar apuração do sorteio?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Você está prestes a apurar o sorteio <strong className="text-foreground">{raffleToDraw?.title}</strong>.
              O sistema selecionará aleatoriamente um cupom válido, registrará o participante contemplado e finalizará o concurso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={Boolean(drawingRaffleId)}
              className="h-10 px-4 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDrawRaffle();
              }}
              disabled={Boolean(drawingRaffleId)}
              className="h-10 px-4 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {drawingRaffleId ? "Apurando..." : "Confirmar e Sortear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
